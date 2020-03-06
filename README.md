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

------------MEM usage-----------------

extractVideoFrames: 1.306sec
forLoop: 0.898sec
ffmpeg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287285pCucO1zMr6N/video-%04d.jpg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287285pCucO1zMr6N/audio.mp3 -y -filter:v pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p -f mp4 /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287285pCucO1zMr6N/output.mp4
all done...
createVideo: 1.437sec
rss 258.05 MB
heapTotal 147.69 MB
heapUsed 106.85 MB
external 3.03 MB
----------------------------------
extractVideoFrames: 2.616sec
forLoop: 3.828sec
ffmpeg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287283Qi6OEzu8HaV/video-%04d.jpg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287283Qi6OEzu8HaV/audio.mp3 -y -filter:v pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p -f mp4 /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-287283Qi6OEzu8HaV/output.mp4
all done...
createVideo: 6.025sec
rss 433.79 MB
heapTotal 153.79 MB
heapUsed 122.67 MB
external 10.71 MB
----------------------------------
extractVideoFrames: 3.476sec
forLoop: 3.618sec
ffmpeg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-28728gxgYj2BbRxe2/video-%04d.jpg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-28728gxgYj2BbRxe2/audio.mp3 -y -filter:v pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p -f mp4 /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-28728gxgYj2BbRxe2/output.mp4
all done...
createVideo: 5.774sec
rss 477.27 MB
heapTotal 165.13 MB
heapUsed 131.9 MB
external 7.46 MB
----------------------------------

ffmpeg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-351749e7ZUAc6zj8t/video.mp4 -y -r 25 /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-351749e7ZUAc6zj8t/video-%04d.jpg

ffmpeg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-351749e7ZUAc6zj8t/video-%04d.jpg -i /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-351749e7ZUAc6zj8t/video.mp4 -y -filter:v pad=ceil(iw/2)*2:ceil(ih/2)*2,format=yuv420p -map 0:v:0 -map 1:a:0 -f mp4 /var/folders/q9/m55jmdvx5mdg558wgh1d6sbwx6hmp6/T/tmp-351749e7ZUAc6zj8t/output.mp4

-------------------------