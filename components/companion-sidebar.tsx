import React from 'react';

interface CompanionSidebarProps {
  children?: React.ReactNode;
}

const CompanionSidebar: React.FC<CompanionSidebarProps> = ({ 
  children 
}) => {
  return (
    <div className="w-full md:w-72 h-full border-r border-gray-800">
      <div className="p-4">
        {children}
      </div>
    </div>
  );
};

export default CompanionSidebar; 