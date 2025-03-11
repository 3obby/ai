/**
 * Format file size in bytes to a human-readable format
 */
export const formatBytes = (bytes: number, decimals = 2): string => {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB"];
  
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

/**
 * Format timestamp to a readable date string
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Format file type for display
 */
export const formatFileType = (type: string): string => {
  if (!type) return "?";
  
  // Extract extension from MIME type or filename
  const extension = type.includes("/") 
    ? type.split("/")[1].toUpperCase() 
    : type.split(".").pop()?.toUpperCase();
  
  return extension?.substring(0, 3) || "?";
}

/**
 * Get color for file type
 */
export const getColorForFileType = (type: string): string => {
  if (!type) return "bg-gray-500";
  
  const lowerType = type.toLowerCase();
  
  if (lowerType.includes("image") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(lowerType)) {
    return "bg-blue-500";
  } else if (lowerType.includes("pdf") || /\.pdf$/i.test(lowerType)) {
    return "bg-red-500";
  } else if (lowerType.includes("word") || lowerType.includes("document") || /\.(doc|docx)$/i.test(lowerType)) {
    return "bg-indigo-500";
  } else if (lowerType.includes("text") || /\.(txt|md)$/i.test(lowerType)) {
    return "bg-green-500";
  } else if (lowerType.includes("spreadsheet") || /\.(xls|xlsx|csv)$/i.test(lowerType)) {
    return "bg-emerald-500";
  } else if (lowerType.includes("presentation") || /\.(ppt|pptx)$/i.test(lowerType)) {
    return "bg-orange-500";
  } else {
    return "bg-gray-500";
  }
} 