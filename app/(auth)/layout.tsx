import Image from "next/image";

const AuthLayout = ({
  children
}: {
  children: React.ReactNode;
}) => {
  return ( 
    <div className="relative flex justify-center items-center h-full min-h-screen w-full overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 w-full h-full z-0">
        <Image 
          src="/robobirds.png" 
          alt="Background" 
          fill 
          priority
          className="object-cover opacity-80" 
        />
      </div>
      
      {/* Content overlay with glassmorphism effect */}
      <div className="relative z-10 w-full max-w-md">
        {children}
      </div>
    </div>
  );
}
 
export default AuthLayout;