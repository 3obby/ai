import React from 'react';

interface NoResultsProps {
  message?: string;
}

const NoResults: React.FC<NoResultsProps> = ({ 
  message = "No results found" 
}) => {
  return (
    <div className="h-full flex flex-col items-center justify-center p-4">
      <div className="text-muted-foreground text-center">
        <p>{message}</p>
      </div>
    </div>
  );
};

export default NoResults; 