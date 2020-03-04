import * as admin from "firebase-admin";
import * as serviceAccount from "../config/serviceAccountKey.json";

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as any),
  databaseURL: "https://funwithlimbo.firebaseio.com",
  storageBucket: "funwithlimbo.appspot.com"
});

const baseUrl = "https://storage.googleapis.com/funwithlimbo.appspot.com";
const bucket = admin.storage().bucket();

export async function getDownloadUrl(path: string) {
  const expires = new Date().getTime() + (5 * 60 * 1000); // 5 mins
  const res = await bucket.file(path).getSignedUrl({ action: "read", expires });
  return res[0];
}

export async function downloadFile(src: string, dest: string) {
  return bucket.file(src).download({ destination: dest });
}


// export async function uploadImage(url: string, dest: string) {
//   try {
//     const buffer = await download(url);
//     const file = bucket.file(dest);

//     await file.save(buffer, {
//       gzip: true,
//       metadata: {
//         contentType: "image/jpeg"
//       }
//     });

//     await file.makePublic();

//     return `${baseUrl}/${dest}`;
//   } catch (e) {
//     console.error(e);
//   }
// }

export async function deleteImage(path: string) {
  try {
    await bucket.file(path).delete();
  } catch (e) {
    console.error(e);
  }
}

export async function verifyToken(idToken: string) {
  if (idToken) {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);

      if (decodedToken) {
        const { uid, admin } = decodedToken;
        return { uid, admin };
      }
    } catch (err) {
      // Handle error
      throw err;
    }
  }
}

export async function grantAdminRole(email: string) {
  const user: any = await admin.auth().getUserByEmail(email);

  if (user.customClaims && user.customClaims.admin === true) {
    return;
  }

  return admin.auth().setCustomUserClaims(user.uid, {
    admin: true
  });
}
