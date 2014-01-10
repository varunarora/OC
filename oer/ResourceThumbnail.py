from VideoHelper import VideoHelper
#from webkit2pngInit import WebKit2PNG, WebKit2PNGOptions
import json
from subprocess import call
from django.conf import settings


class ResourceThumbnail:

    THUMBNAIL_WIDTH = 60
    THUMBNAIL_HEIGHT = 60
    THUMBNAIL_EXT = ".jpg"

    def __init__(self):
        pass

    @staticmethod
    def generateThumbnail(original_resource):
        thumbnailDir = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/'
        thumbnail = thumbnailDir + str(original_resource.id)

        (resource, resource_type) = ResourceThumbnail.get_resource_type(original_resource)

        if resource_type == "video":

            try:
                provider = VideoHelper.getVideoProvider(resource.url)
                video_tag = VideoHelper.getVideoID(resource.url, provider)

                thumbnailUrl = ResourceThumbnail.getThumbnailFromProvider(video_tag, provider)

                import urllib

                # Returns a 120x90 image
                urllib.urlretrieve(thumbnailUrl, thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT)

                call(
                    ["convert", "-size", str(ResourceThumbnail.THUMBNAIL_HEIGHT) + "x"
                        + str(ResourceThumbnail.THUMBNAIL_WIDTH), "xc:white", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                call(
                    ["composite", "-geometry", "-30-15", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT,
                        thumbnail + ResourceThumbnail.THUMBNAIL_EXT, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                # Now delete the temporary retrived image thumbnail
                call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])

            except:
                resource.type = 'url'
                ResourceThumbnail.generateURLThumbnail(resource, thumbnail)

        elif resource_type == "article":
            call(["cp", settings.MEDIA_ROOT + "resource_thumbnail/defaults/" + "article.jpg", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

        elif resource_type == "url":
            ResourceThumbnail.generateURLThumbnail(resource, thumbnail)

        elif resource_type == "attachment":

            # Figure out the extension of the attachment
            from os.path import splitext
            name, resource.extension = splitext(resource.file.name)

            ms = [".doc", ".docx", ".ppt", ".pptx", ".rtf", "odt", ".odp"]
            pdf = [".pdf"]
            image = [".jpg", ".jpeg", ".png", ".bmp", ".eps", ".ps", ".gif", ".tiff"]

            ext = str.lower(str(resource.extension))

            if ext in ms:
                thumbnailSrcName = "ms.jpg"
            elif ext in pdf:
                thumbnailSrcName = "pdf.jpg"
            elif ext in image:
                thumbnailSrcName = "image.jpg"
            else:
                thumbnailSrcName = "blank.jpg"

            call(
                ["cp", settings.MEDIA_ROOT + 'resource_thumbnail/defaults/' + thumbnailSrcName,
                    thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

        from django.core.files.images import ImageFile
        thumbnail_to_assign = ImageFile(
            open(thumbnail + ResourceThumbnail.THUMBNAIL_EXT))
        # NOTE(Varun): It's really important to keep the save as false, to avoid
        #     a recursion here
        resource.image.save(
            thumbnail_to_assign.name, thumbnail_to_assign, save=False)

        # Now delete the temporary image thumbnail
        call(["rm", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

    @staticmethod
    def getThumbnailFromProvider(video_tag, provider):

        import httplib
        request_url = "/feeds/api/videos/" + video_tag + "?v=2&alt=jsonc"

        req = httplib.HTTPConnection('gdata.youtube.com', 80)
        req.connect()

        req.request('GET', request_url)
        response = req.getresponse()

        responseJSON = json.loads(response.read())

        return responseJSON['data']['thumbnail']['hqDefault']

    @staticmethod
    def generateURLThumbnail(resource, thumbnail):
        # NOTE: This method did not work due to multithreading challenges
        # Set options for the screenshot
        # options = WebKit2PNGOptions()
        # options.url = resource.url

        #if __name__ == "__main__":
            #webkit2png = WebKit2PNG.generatePng(resource.url, options)

        call(
            ["phantomjs", settings.PROJECT_PATH + "oer/takeScreenshot.js", resource.url, thumbnail + "-tmp"
                + ResourceThumbnail.THUMBNAIL_EXT])

        call(
            ["convert", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT, "-resize",
                "600x300", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

        # Now delete the temporary retrived image thumbnail
        call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])


    @staticmethod
    def get_resource_type(resource):
        from django.contrib.contenttypes.models import ContentType
        from oer.models import Document, Link, Attachment

        document_content_type = ContentType.objects.get_for_model(Document)
        link_content_type = ContentType.objects.get_for_model(Link)
        attachment_content_type = ContentType.objects.get_for_model(Attachment)

        if resource.revision.content_type == document_content_type:
            return (resource, 'article')

        elif resource.revision.content_type == link_content_type:            
            import urlparse
            url_data = urlparse.urlparse(resource.revision.content.url)
            domain = url_data.hostname
            hostname = domain.split(".")[:-1]

            resource.url = resource.revision.content.url

            if "youtube" in hostname or "vimeo" in hostname:
                return (resource, 'video')

            return (resource, 'url')

        elif resource.revision.content_type == attachment_content_type:
            resource.file = resource.revision.content.file
            return (resource, 'attachment')





