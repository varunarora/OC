from oer.BeautifulSoup import BeautifulSoup
from django.conf import settings


class ArticleThumbnail:
    THUMBNAIL_HEIGHT = 346
    THUMBNAIL_WIDTH = 346
    MIN_THUMBNAIL_HEIGHT = 100
    MIN_THUMBNAIL_WIDTH = 100
    THUMBNAIL_IMG_RATIO = 1.15
    THUMBNAIL_EXT = ".jpg"

    def __init__(self, *args, **kwargs):
        pass

    def generateThumbnail(self, article):
        # Get all the images from the article
        articleImages = self.getArticleImages(
            article.revision.body_markdown_html)

        from subprocess import call
        #thumbnail = settings.STATIC_ROOT + "images/thumbnails/" + str(article.id) + "-thumb"
        thumbnail = settings.MEDIA_ROOT + "article/tmp/" + str(
            article.id) + "-thumb"

        if articleImages:
            # Figure out largest image among list of images
            img = self.getLargestImage(articleImages)

            # If there is atleast one large enough image in the article
            if img is not None:
                # Create a JPG copy with the white background
                call(["convert", "-size", str(
                    self.THUMBNAIL_HEIGHT)+"x"+str(self.THUMBNAIL_WIDTH),
                    "xc:white", thumbnail + self.THUMBNAIL_EXT])

                imgWidth = img.size[0]
                imgHeight = img.size[1]

                # If both width and height are larger than ideal height
                #     requirement
                if imgWidth >= self.THUMBNAIL_WIDTH and imgHeight >= self.THUMBNAIL_HEIGHT:
                    imgMidpoint = [imgWidth/2, imgHeight/2]
                    imgTopLeft = [imgMidpoint[0] - self.THUMBNAIL_WIDTH/2,
                                  imgMidpoint[1] - self.THUMBNAIL_HEIGHT/2]

                    # Create a thumbnail with the center of the image as anchor
                    call(["composite", "-geometry", "-" + str(imgTopLeft[0]) + "-" + str(imgTopLeft[1]),
                         img.path, thumbnail + self.THUMBNAIL_EXT, thumbnail + self.THUMBNAIL_EXT])

                # If both width and height are larger than the thumbnail height
                elif imgWidth >= self.MIN_THUMBNAIL_WIDTH and imgHeight >= self.MIN_THUMBNAIL_HEIGHT:
                    scaledForegroundImageHeight = int(self.THUMBNAIL_HEIGHT*self.THUMBNAIL_IMG_RATIO)
                    scaledForegroundImageWidth = int(self.THUMBNAIL_WIDTH*self.THUMBNAIL_IMG_RATIO)

                    # Resize the image to be its original size multiplied by a
                    #     factor
                    call(["convert", img.path, "-resize", str(scaledForegroundImageWidth) + "x" +
                         str(scaledForegroundImageHeight),
                         "-size", str(self.THUMBNAIL_WIDTH) + "x" + str(self.THUMBNAIL_HEIGHT),
                         "xc:transparent", "+swap", "-gravity", "center", "-composite",
                         thumbnail + "-tmp" + ".png"])

                    call(["composite", thumbnail + "-tmp" + ".png",
                         thumbnail + self.THUMBNAIL_EXT, thumbnail + self.THUMBNAIL_EXT])

                    # Now delete the temporary resized image thumbnail
                    call(["rm", thumbnail + "-tmp" + ".png"])
                else:
                    thumbnailSrc = self.setRandomTexture(article)
                    call(["cp", thumbnailSrc, thumbnail + self.THUMBNAIL_EXT])

            else:
                thumbnailSrc = self.setRandomTexture(article)
                call(["cp", thumbnailSrc, thumbnail + self.THUMBNAIL_EXT])

        # If no image has been found
        else:
            # Return article thumbnail to be a generated random texture
            thumbnailSrc = self.setRandomTexture(article)
            call(["cp", thumbnailSrc, thumbnail + self.THUMBNAIL_EXT])

        from django.core.files.images import ImageFile
        thumbnail_to_assign = ImageFile(open(thumbnail + self.THUMBNAIL_EXT))
        # NOTE(Varun): It's really important to keep the save as false, to avoid
        #     a recursion here
        article.image.save(
            thumbnail_to_assign.name, thumbnail_to_assign, save=False)

        # Now delete the temporary image thumbnail
        call(["rm", thumbnail + self.THUMBNAIL_EXT])

    def getArticleImages(self, body):
        soup = BeautifulSoup(body)
        imageElements = soup.findAll('img')

        def getSrc(x):
            return x['src']

        return map(getSrc, imageElements)

    def setRandomTexture(self, article):
        import random
        txtr = random.randint(1, 5)
        return settings.MEDIA_ROOT + "article/textures/" + str(txtr) + ".jpg"

    def getLargestImage(self, images):
        maxWidthImage = None
        maxHeightImage = None

        maxWidth, maxHeight = 0, 0

        for image in images:
            # Fetch the image from the filesystem
            from PIL import Image
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
