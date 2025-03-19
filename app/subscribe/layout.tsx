import React from 'react';

export default function SubscribeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="subscribe-layout">
      {/* Add any custom layout elements here, such as a header or footer specific to the subscription page */}
      <header className="subscribe-header">
       
      </header>
      <main>{children}</main>
      <footer className="subscribe-footer">
        {/* Custom footer content */}
      </footer>
    </div>
  );
}