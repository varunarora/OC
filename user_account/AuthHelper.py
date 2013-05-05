class AuthHelper():

	@staticmethod
	def generateGPlusContext(request):
		import random, string
		# Create a state token to prevent request forgery.
		# Store it in the session for later validation.
		state = ''.join(random.choice(string.ascii_uppercase + string.digits)
		              for x in xrange(32))

		request.session['state'] = state
	
		# Set the Client ID, Token State, and Application Name in the HTML while serving it.
		# TODO: This data should not be hard coded in the script this way, perhaps moved to settings.py
		context = {'client_id' : '747453362533.apps.googleusercontent.com', 'state' : state, 'application_name' : 'OpenCurriculum'}
		return context
