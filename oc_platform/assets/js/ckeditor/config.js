/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

CKEDITOR.editorConfig = function( config ) {
	// Define changes to default configuration here. For example:
	// config.language = 'fr';
	// config.uiColor = '#AADC6E';
};

CKEDITOR.config.contentsCss = '/static/assets/css/ckeditor/contents.css';
CKEDITOR.config.skin = 'moono,/static/assets/css/ckeditor/skins/moono/';

CKEDITOR.config.toolbar_Basic = [
    [ '-', 'Bold', 'Italic' ],
    [ 'NumberedList','BulletedList'],
    [ 'Link', 'Unlink' ],
    [ 'Source' ]
];
CKEDITOR.config.toolbar_Full = [
['Source','-','Save','NewPage','Preview','-','Templates'],
['Undo','Redo','-','Find','Replace','-','SelectAll','RemoveFormat'],
'/',
['Bold','Italic','Underline','Strike','-','Subscript','Superscript'],
['Link','Unlink','Anchor'],
'/',
['Styles','Format','Font','FontSize'],
];

CKEDITOR.config.toolbar = 'Basic';

CKEDITOR.dtd.$editable.td = 1;
CKEDITOR.dtd.$editable.th = 1;