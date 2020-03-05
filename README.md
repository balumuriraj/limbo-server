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


-------------------------

gcloud cmds:
-----
init:
1. git clone https://github.com/balumuriraj/limbo-server.git
2. Add serviceAccountKey.json
3. export PORT=8080 && npm install
4. gcloud app deploy 

updates:
1. git pull
2. export PORT=8080 && npm install
3. gcloud app deploy
