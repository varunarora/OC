import urlparse
		
class VideoHelper:
	
	@staticmethod
	def getVideoHost(url):
		url_data = urlparse.urlparse(url)
		
		domain = url_data.hostname
		hostname = domain.split(".")[:-1]
		
		return hostname
		
	@staticmethod
	def getVideoProvider(url):
		hostname = VideoHelper.getVideoHost(url)
		
		if "youtube" in hostname:
			return "youtube"
		
		elif "vimeo" in hostname:
			return "vimeo"
		
		else:
			return None
			
	@staticmethod
	def getVideoID(url, provider):
		
		url_data = urlparse.urlparse(url)
	
		if provider == "youtube":
			query = urlparse.parse_qs(url_data.query)
			video = query["v"][0]
			return video
			
		elif provider == "vimeo":
			return url_data.path.split('/')[1]
			
		else:
			return None
