import React from "react";
import { IKContext, IKUpload } from "imagekitio-react";

export default function ImageUpload() {
  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Upload Image</h1>

      <IKContext
  publicKey={import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY} // pakai public key dari .env frontend
  urlEndpoint="https://ik.imagekit.io/arina123"
  authenticator={async () => {
    const response = await fetch("http://localhost:8000/api/imagekit/auth");
    if (!response.ok) throw new Error("Auth API failed");
    return await response.json(); // {token, expire, signature}
  }}
>
  <IKUpload
    fileName="my-upload.jpg"
    onError={(err) => console.error("Upload Error:", err)}
    onSuccess={(res) => console.log("Upload Success:", res)}
  />
</IKContext>

    </div>
  );
}
