import React from 'react';

function ExternalWebsiteViewer() {
  return (
    <iframe
      src="/ASHA/index.html"
      title="External Website"
      style={{ width: '100%', height: '100vh', border: 'none' }}
    />
  );
}

export default ExternalWebsiteViewer; 