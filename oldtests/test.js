const center = new Element('div').setStyles({
	'width': '100%',
	'height': '100%',
	'display': 'flex',
	'justify-content': 'center',
	'align-items': 'center',
}).appendChild(
	new Element('div').setStyles({
		width: '480px',
		height: '182px',
		backgroundColor: '#8880',
		display: 'flex',
		padding: '20px',
		position: 'relative'
	}).addChildren(
		[new Element('div').setStyles({
			'border': '2px solid var(--color-foreground)',
			'box-shadow': 'rgb(0, 0, 0, 0.4) 0px 0px 14px 4px',
			'width': '180px',
			'height': '180px',
			'backgroundImage': 'url(https://i.ytimg.com/vi/6ESMkkhAodQ/hqdefault.jpg?sqp=-oaymwEZCNACELwBSFXyq4qpAwsIARUAAIhCGAFwAQ==&rs=AOn4CLCiwj8J82lGjfsCapavKdcdytCE5A)',
			'background-position': 'center',
			'background-size': 'cover'
		}),
		new Element('div').setStyles({
			'margin-left': '32px',
			'height': '100%',
			'display': 'flex',
			'flex-direction': 'column',
			'font-family': '"Google Sans"'
		}).appendChild(
			new Element('span').setText('Flite - Kairos').setStyles({'color': 'var(--color-text-primary)', 'margin-top': '32px', 'margin-bottom': '20px', 'font-size': '24px'}),
			new Element('span').setText('Liquicity').setStyle('color', 'var(--color-text-secondary)')
		)]
	),

	new Element('div').setStyles({
		width: '720px',
		height: '182px',
		backgroundColor: '#0000',
		display: 'flex',
		padding: '20px',
		position: 'relative',
		'justify-content': 'center',
		'align-items': 'center',
	}).appendChild(new Element('div').setStyles({
		'border-radius': '1000px',
		'width': '400px',
		'height': '60px',
		'padding': '16px',
		'background-color': '#fff',
		'box-shadow': '#0003 0px 4px 20px 0px',
		display: 'flex',
		'flex-direction': 'column',
		position: 'relative',
		'justify-content': 'center',
		'align-items': 'center',
	}).appendChild(
		new Element('div').setStyles({
			'width': '360px',
			'height': '45px',
			'display': 'flex',
			'justify-content': 'center',
			'align-items': 'center',
			'flex-direction': 'row'
		}).appendChild(
			new SVGElement('svg').setViewbox(16, 16).setStyles({width: '32px', height: '32px', fill: '#000'}).appendChild(new SVGElement('path').setPath('M13 2.5L5 7.119V3H3v10h2V8.881l8 4.619z')),
			new SVGElement('svg').setViewbox(36, 36).setStyles({width: '32px', height: '32px', fill: '#000', transform: 'scale(1.8)'}).appendChild(new SVGElement('path').setPath('M 12,26 16,26 16,10 12,10 z M 21,26 25,26 25,10 21,10 z')),
			new SVGElement('svg').setViewbox(16, 16).setStyles({width: '32px', height: '32px', fill: '#000'}).appendChild(new SVGElement('path').setPath('M11 3v4.119L3 2.5v11l8-4.619V13h2V3z'))
		),
		new Element('div').setStyles({
			'position': 'absolute',
			'bottom': '16px',
			'width': 'calc(100% - 120px)',
			'height': '4px',
			'border-radius': '100px',
			'background-color': '#444'
		})
	))
);

document.body.appendChild(center.domElement);