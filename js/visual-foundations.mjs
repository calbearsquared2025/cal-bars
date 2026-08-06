const FONT_STYLESHEET_ID = 'cgb-approved-fonts';
const FOUNDATION_STYLESHEET_ID = 'cgb-visual-foundations';

function appendStylesheet({ id, href, crossOrigin = '' }) {
  if (document.getElementById(id)) return;
  const link = document.createElement('link');
  link.id = id;
  link.rel = 'stylesheet';
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.append(link);
}

function appendPreconnect(href, crossOrigin = '') {
  if (document.head.querySelector(`link[rel="preconnect"][href="${href}"]`)) return;
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = href;
  if (crossOrigin) link.crossOrigin = crossOrigin;
  document.head.append(link);
}

appendPreconnect('https://fonts.googleapis.com');
appendPreconnect('https://fonts.gstatic.com', 'anonymous');
appendStylesheet({
  id: FONT_STYLESHEET_ID,
  href: 'https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600..900&family=Inter:wght@400..900&family=Source+Serif+4:opsz,wght@8..60,400..800&display=swap'
});
appendStylesheet({ id: FOUNDATION_STYLESHEET_ID, href: 'css/visual-foundations.css' });
