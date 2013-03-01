from VideoHelper import VideoHelper
from webkit2pngInit import WebKit2PNG, WebKit2PNGOptions
import json
from subprocess import call

class ResourceThumbnail:

	THUMBNAIL_WIDTH = 60	
	THUMBNAIL_HEIGHT = 60
	THUMBNAIL_EXT = ".jpg"
	
	def __init__(self):
		pass
	
	@staticmethod
	def generateThumbnail(resource):
		thumbnailDir = "oc_platform/assets/images/oer_thumbnails/"
		thumbnail = thumbnailDir + str(resource.id) + "-thumb"

		if resource.type == "video":
			
			provider = VideoHelper.getVideoProvider(resource.url)
			video_tag = VideoHelper.getVideoID(resource.url, provider)
			
			thumbnailUrl = ResourceThumbnail.getThumbnailFromProvider(video_tag, provider)
						
			import urllib
			
			# Returns a 120x90 image
			urllib.urlretrieve(thumbnailUrl, thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT)
			
			call(["convert", "-size", str(ResourceThumbnail.THUMBNAIL_HEIGHT) + "x" + 
				str(ResourceThumbnail.THUMBNAIL_WIDTH), "xc:white", thumbnail +
				ResourceThumbnail.THUMBNAIL_EXT])
			
			call(["composite", "-geometry", "-30-15", thumbnail + "-tmp" +
				ResourceThumbnail.THUMBNAIL_EXT, thumbnail + ResourceThumbnail.THUMBNAIL_EXT, thumbnail + ResourceThumbnail.THUMBNAIL_EXT])
			
			# Now delete the temporary retrived image thumbnail
			call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])
			
		elif resource.type == "article":
			call(["cp", thumbnailDir + "rsrcs/" + "article.jpg", thumbnail + ResourceThumbnail.THUMBNAIL_EXT])
		
		elif resource.type == "url":
		
			# NOTE: This method did not work due to multithreading challenges
			# Set options for the screenshot
			# options = WebKit2PNGOptions()
			# options.url = resource.url
			
			#if __name__ == "__main__":
				#webkit2png = WebKit2PNG.generatePng(resource.url, options)
			
			call(["phantomjs", "oer/takeScreenshot.js", resource.url, thumbnail + "-tmp" +  ResourceThumbnail.THUMBNAIL_EXT])
			
			call(["convert", thumbnail + "-tmp" +  ResourceThumbnail.THUMBNAIL_EXT, "-resize", "200x200",
			thumbnail +  ResourceThumbnail.THUMBNAIL_EXT ])			
						
			# Now delete the temporary retrived image thumbnail
			call(["rm", thumbnail + "-tmp" + ResourceThumbnail.THUMBNAIL_EXT])

			
		elif resource.type == "attachment":
			
			# Figure out the extension of the attachment
			from os.path import splitext	
			name, resource.extension = splitext(resource.file.name)
			
			ms = [".doc", ".docx", ".ppt", ".pptx", ".rtf", "odt", ".odp"]
			pdf = [".pdf"]
			image = [".jpg", ".jpeg", ".png", ".bmp", ".eps", ".ps", ".gif", ".tiff"]
			
			ext = str.lower(resource.extension)
			
			if ext in ms:
				thumbnailSrcName = "ms.jpg"
			elif ext in pdf:
				thumbnailSrcName = "pdf.jpg"
			elif ext in image:
				thumbnailSrcName = "image.jpg"
			else:
				thumbnailSrcName = "blank.jpg"
			
			call(["cp", thumbnailDir + "rsrcs/" + thumbnailSrcName,
				thumbnail + ResourceThumbnail.THUMBNAIL_EXT])
		
	@staticmethod		
	def getThumbnailFromProvider(video_tag, provider):
	
		import httplib
		request_url = "/feeds/api/videos/" + video_tag + "?v=2&alt=jsonc"

		req = httplib.HTTPConnection('gdata.youtube.com', 80)
		req.connect()
		
		req.request('GET', request_url)
		response = req.getresponse()
		
		responseJSON = json.loads(response.read())
		
		return responseJSON['data']['thumbnail']['sqDefault']
