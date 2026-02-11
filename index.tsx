
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Retire preloader a yon fwa React fin kòmanse travay
const preloader = document.getElementById('initial-loader');
if (preloader) {
  // Nou bay yon ti delay 100ms pou asire tranzisyon an dous
  setTimeout(() => {
    preloader.classList.add('loader-hidden');
    // Efase l nèt nan DOM la apre animasyon an fini
    setTimeout(() => preloader.remove(), 500);
  }, 100);
}
