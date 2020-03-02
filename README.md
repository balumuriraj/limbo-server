limbo-server

Stack:
---------
BackEnd: Node.js Express
Server hosting: Google App Engine
Database: Firestore
FrontEnd: React.js
Website hosting: Firebase
Mobile: ReactNative

Data Structure:
---------------

clip: {
  id: string;
  title: string;
  url: string;
  duration: number;
  frames: number;
  fps: number;
  animation: string;
  keywords: string[];
  thumbnail: string;
  
  meta: {
    downloads: number;
    favorites: number;
    bookmarks: number;
  };

  userMeta: {
    isFavorite: boolean;
    isBookmarked: boolean;
  }
}

user: {
  id: string;
  faces: string[];
  favorites: string[];
  bookmarks: string[];
}
