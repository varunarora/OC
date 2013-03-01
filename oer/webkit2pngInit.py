#!/usr/bin/env python
#
# webkit2pngInit.py
#
# Creates screenshots of webpages using by QtWebkit.
#
# Copyright (c) 2008 Roland Tapken <roland@dau-sicher.de>
#
# This program is free software; you can redistribute it and/or
# modify it under the terms of the GNU General Public License
# as published by the Free Software Foundation; either version 2
# of the License, or (at your option) any later version.
#
# This program is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
#
# You should have received a copy of the GNU General Public License
# along with this program; if not, write to the Free Software
# Foundation, Inc., 51 Franklin Street, Fifth Floor, Boston, MA  02110-1301, USA

from webkit2png import WebkitRenderer

import os
import logging
import signal

from PyQt4.QtCore import *
from PyQt4.QtGui import *
from PyQt4.QtWebKit import *
from PyQt4.QtNetwork import *

class WebKit2PNG:
	
	@staticmethod
	def generatePng(url, options, qtargs=None):
			# Enable HTTP proxy
			if 'http_proxy' in os.environ:
				proxy_url = urlparse.urlparse(os.environ.get('http_proxy'))
				proxy = QNetworkProxy(QNetworkProxy.HttpProxy, proxy_url.hostname, proxy_url.port)
				QNetworkProxy.setApplicationProxy(proxy)
	
			logger = logging.getLogger('webkit2png');	
		
			def __main_qt():
		
				# Render the page.
				# If this method times out or loading failed, a RuntimeException is thrown
				try:
					# Initialize WebkitRenderer object
					renderer = WebkitRenderer()
					renderer.logger = logger
					renderer.width = options.geometry[0]
					renderer.height = options.geometry[1]
					renderer.timeout = options.timeout
					renderer.wait = options.wait
					renderer.format = options.format
					renderer.grabWholeWindow = options.window
					renderer.renderTransparentBackground = options.transparent
					renderer.encodedUrl = options.encoded_url
					renderer.url = options.url

					if options.scale:
						renderer.scaleRatio = options.ratio
						renderer.scaleToWidth = options.scale[0]
						renderer.scaleToHeight = options.scale[1]

					if options.features:
						if "javascript" in options.features:
							renderer.qWebSettings[QWebSettings.JavascriptEnabled] = True
						if "plugins" in options.features:
							renderer.qWebSettings[QWebSettings.PluginsEnabled] = True
			
					print options.url
					print options.output
					renderer.render_to_file(url=options.url, file_object=options.output)
					QApplication.exit(0)
					return True

				except RuntimeError, e:
					QApplication.exit(1)
					return False
		
			app = WebKit2PNG.launchQtApplication(qtargs)
			#signal.signal(signal.SIGINT, signal.SIG_DFL)
		
			QTimer.singleShot(0, __main_qt)
			app.exec_()
		
	@staticmethod	
	def launchQtApplication(display=None, style=None, qtargs=None):	

			"""Initiates the QApplication environment using the given args."""
			if QApplication.instance():
				return QApplication.instance()

			qtargs2 = []

			if display:
				qtargs2.append('-display')
				qtargs2.append(display)
				# Also export DISPLAY var as this may be used
				# by flash plugin
				# os.environ["DISPLAY"] = display

			if style:
				qtargs2.append('-style')
				qtargs2.append(style)

			qtargs2.extend(qtargs or [])

			return QApplication(qtargs2)


class WebKit2PNGOptions:
	geometry = [0,0]
	timeout = 0 # Time before request will be cancelled
	wait = 0 # Time to wait after loading before screenshot is taken
	format = "png"
	window = False # Grab whole window instead of frames
	transparent = False
	encoded_url = False
	scale = False
	features = ["javascript"]
	url = ""
	output = open('screenshot.png', "w")
