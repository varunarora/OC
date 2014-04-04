/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here. For example:
	// config.language = 'fr';
	// config.uiColor = '#AADC6E';
    config.extraPlugins = 'internallink';
    config.baseFloatZIndex = 4;
    config.removePlugins = 'link';
};

CKEDITOR.config.contentsCss = '/static/assets/css/ckeditor/contents.css';
CKEDITOR.config.skin = 'moono,/static/assets/css/ckeditor/skins/moono_docs/';

CKEDITOR.config.toolbar_Basic = [
    [ 'Format','FontSize', '-', 'Bold', 'Italic' ],
    [ 'NumberedList','BulletedList'],
    [ 'InternalLink', 'InternalUnlink' ]
];
CKEDITOR.config.toolbar_Full = [
['Undo','Redo','Styles','Format','FontSize'],
['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],
[ 'NumberedList','BulletedList'],
['InternalLink', 'InternalUnlink'],
['OCImage', 'Video', 'Attach']
];

CKEDITOR.config.toolbar = 'Basic';

CKEDITOR.config.allowedContent = true;

CKEDITOR.dtd.$editable.td = 1;
CKEDITOR.dtd.$editable.th = 1;

// Turn off automatic editor creation first.
CKEDITOR.disableAutoInline = true;