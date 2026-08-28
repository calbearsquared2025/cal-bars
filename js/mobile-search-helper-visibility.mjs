const STYLE_ID = 'cgb-mobile-search-helper-visibility';

function installMobileSearchHelperVisibility(documentObject = document) {
  if (!documentObject || documentObject.getElementById(STYLE_ID)) return false;
  const style = documentObject.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    @media (max-width: 899px) {
      #location-search:has(#location-query:placeholder-shown) #search-dropdown {
        display: none !important;
      }
    }
  `;
  documentObject.head.append(style);
  return true;
}

installMobileSearchHelperVisibility();

export { installMobileSearchHelperVisibility };
