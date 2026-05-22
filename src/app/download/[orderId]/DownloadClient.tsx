"use client";

type PurchasedPhoto = {
  id: string;
  title: string;
  originalUrl: string;
  thumbUrl: string;
  mimeType: string;
};

export default function DownloadClient({
  photos,
}: {
  photos: PurchasedPhoto[];
}) {
  const downloadAll = () => {
    photos.forEach((photo, i) => {
      setTimeout(() => {
        const a = document.createElement("a");
        a.href = photo.originalUrl;
        a.download = photo.title;
        a.click();
      }, i * 500);
    });
  };

  const downloadOne = (photo: PurchasedPhoto) => {
    const a = document.createElement("a");
    a.href = photo.originalUrl;
    a.download = photo.title;
    a.click();
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <p className="text-sm text-gray-600">
          {photos.length} photo(s) — Thank you for your purchase!
        </p>
        {photos.length > 1 && (
          <button
            onClick={downloadAll}
            className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
          >
            Download All
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white rounded-lg shadow overflow-hidden"
          >
            <div className="aspect-square relative bg-gray-100">
              <img
                src={photo.thumbUrl}
                alt={photo.title}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <p className="text-sm font-medium text-gray-900 truncate">
                {photo.title}
              </p>
              <button
                onClick={() => downloadOne(photo)}
                className="mt-2 w-full text-center bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700"
              >
                Download
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
