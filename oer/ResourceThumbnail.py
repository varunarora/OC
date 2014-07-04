from VideoHelper import VideoHelper
#from webkit2pngInit import WebKit2PNG, WebKit2PNGOptions
import json
from subprocess import call, check_output
from django.conf import settings
from oer.BeautifulSoup import BeautifulSoup

class ResourceThumbnail:

    THUMBNAIL_WIDTH = 200
    THUMBNAIL_HEIGHT = 200
    MIN_THUMBNAIL_HEIGHT = 100
    MIN_THUMBNAIL_WIDTH = 100
    THUMBNAIL_IMG_RATIO = 1.15
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
            ResourceThumbnail.generate_thumbnail(resource)

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
                call(
                    ["convert", "-density", "300",
                    settings.MEDIA_ROOT + resource.revision.content.file.name + '[0]',
                    thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])

                call(
                    ["convert", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT,
                        '-resize', '30%', '-gravity', 'center', '-crop', '120x120+0+0',
                        thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                # Now delete the temporary retrived image thumbnail
                call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])

                thumbnailSrcName = "pdf.jpg"
            elif ext in image:
                thumbnailSrcName = "image.jpg"
            else:
                thumbnailSrcName = "blank.jpg"

            if ext not in pdf:
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
        try:
            call(
                ["convert", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT, "-resize",
                    "1280x786", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

            # Now delete the temporary retrived image thumbnail
            call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])

        except:
            call(
                ["cp", settings.MEDIA_ROOT + 'resource_thumbnail/defaults/' + "blank.jpg",
                    thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

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

    @staticmethod
    def generate_thumbnail(article):
        # Get all the images from the article
        articleImages = ResourceThumbnail.get_article_images(
            article.revision.content.elements.all()[0].body['data'])

        from subprocess import call
        #thumbnail = settings.STATIC_ROOT + "images/thumbnails/" + str(article.id) + "-thumb"
        thumbnailDir = settings.MEDIA_ROOT + 'resource_thumbnail/tmp/'
        thumbnail = thumbnailDir + str(article.id)

        if articleImages:
            # Figure out largest image among list of images
            img = ResourceThumbnail.get_largest_image(articleImages)

            # If there is atleast one large enough image in the article
            if img is not None:
                # Create a JPG copy with the white background
                call(["convert", "-size", str(
                    ResourceThumbnail.THUMBNAIL_HEIGHT)+"x"+str(ResourceThumbnail.THUMBNAIL_WIDTH),
                    "xc:white", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                imgWidth = img.size[0]
                imgHeight = img.size[1]

                # If both width and height are larger than ideal height
                #     requirement
                if imgWidth >= ResourceThumbnail.THUMBNAIL_WIDTH and imgHeight >= ResourceThumbnail.THUMBNAIL_HEIGHT:
                    imgMidpoint = [imgWidth/2, imgHeight/2]
                    imgTopLeft = [imgMidpoint[0] - ResourceThumbnail.THUMBNAIL_WIDTH/2,
                                  imgMidpoint[1] - ResourceThumbnail.THUMBNAIL_HEIGHT/2]

                    # Create a thumbnail with the center of the image as anchor
                    call(["composite", "-geometry", "-" + str(imgTopLeft[0]) + "-" + str(imgTopLeft[1]),
                         img.path, thumbnail + ResourceThumbnail.THUMBNAIL_EXT, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                # If both width and height are larger than the thumbnail height
                elif imgWidth >= ResourceThumbnail.MIN_THUMBNAIL_WIDTH and imgHeight >= ResourceThumbnail.MIN_THUMBNAIL_HEIGHT:
                    scaledForegroundImageHeight = int(ResourceThumbnail.THUMBNAIL_HEIGHT*ResourceThumbnail.THUMBNAIL_IMG_RATIO)
                    scaledForegroundImageWidth = int(ResourceThumbnail.THUMBNAIL_WIDTH*ResourceThumbnail.THUMBNAIL_IMG_RATIO)

                    # Resize the image to be its original size multiplied by a
                    #     factor
                    call(["convert", img.path, "-resize", str(scaledForegroundImageWidth) + "x" +
                         str(scaledForegroundImageHeight),
                         "-size", str(ResourceThumbnail.THUMBNAIL_WIDTH) + "x" + str(ResourceThumbnail.THUMBNAIL_HEIGHT),
                         "xc:transparent", "+swap", "-gravity", "center", "-composite",
                         thumbnail + "-tmp" + ".png"])

                    call(["composite", thumbnail + "-tmp" + ".png",
                         thumbnail + ResourceThumbnail.THUMBNAIL_EXT, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

                    # Now delete the temporary resized image thumbnail
                    call(["rm", thumbnail + "-tmp" + ".png"])
                else:
                    thumbnailSrc = ResourceThumbnail.set_random_texture(article)
                    call(["cp", thumbnailSrc, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

            else:
                thumbnailSrc = ResourceThumbnail.set_random_texture(article)
                call(["cp", thumbnailSrc, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])

        # If no image has been found
        else:
            # Return article thumbnail to be a generated random texture
            thumbnailSrc = ResourceThumbnail.set_random_texture(article)
            call(["cp", thumbnailSrc, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])


    @staticmethod
    def get_article_images(body):
        soup = BeautifulSoup(body)
        imageElements = soup.findAll('img')

        def getSrc(x):
            return x['src']

        return map(getSrc, imageElements)

    @staticmethod
    def set_random_texture(article):
        import random
        txtr = random.randint(1, 19)
        return settings.MEDIA_ROOT + "article/textures/" + str(txtr) + ".jpg"

    @staticmethod
    def get_largest_image(images):
        maxWidthImage = None
        maxHeightImage = None

        maxWidth, maxHeight = 0, 0

        from PIL import Image
        for image in images:
            # Fetch the image from the filesystem
            from django.conf import settings

            # Get height and width attributes of image
            imgHeight = 0
            imgWidth = 0

            try:
                path = settings.MEDIA_ROOT + '/' + image.replace(
                    settings.MEDIA_URL, '')
                imageFile = Image.open(path)
                imgWidth = imageFile.size[0]
                imgHeight = imageFile.size[1]
                imageFile.path = path

                if imgWidth > maxWidth:
                    maxWidthImage = imageFile
                    maxWidth = imgWidth

                if imgHeight > maxHeight:
                    maxHeightImage = imageFile
                    maxHeight = imgHeight

            except:
                print image + " not found"
                return None

        if maxWidthImage == maxHeightImage:
            return maxWidthImage
        else:
            aspectRatio_widthImg = maxWidthImage.size[1] / maxWidthImage.size[0]
            aspectRatio_HeightImg = maxHeightImage.size[0] / maxHeightImage.size[1]

            if aspectRatio_widthImg > aspectRatio_HeightImg:
                return maxWidthImage
            else:
                return maxHeightImage
