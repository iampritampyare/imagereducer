import React, { useState, useRef } from "react";
import {
  Upload,
  Download,
  FileImage,
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
} from "lucide-react";

const ImageCompressor = () => {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (selectedFile) => {
    if (!selectedFile.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    if (selectedFile.size > 50 * 1024 * 1024) {
      setError("File size must be less than 50MB");
      return;
    }

    setFile(selectedFile);
    setError(null);
    setResult(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(selectedFile);
  };

  const compressImage = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await fetch("http://localhost:8000/api/compress/", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      const rawText = await response.text();
      console.log("RAW response:", rawText);

      const data = JSON.parse(rawText); // manual JSON parse for debug

      if (data.success) {
        setResult(data.data);
      } else {
        setError(data.error || "Failed to compress image");
      }
    } catch (err) {
      console.error("Compression Error:", err);
      setError(err.message || "Network error. Please check if the backend server is running.");
    } finally {
      setLoading(false);
    }
  };

  const downloadCompressed = async () => {
    if (!result) return;

    try {
      const response = await fetch(`http://localhost:8000/api/download/${result.id}/`, {
        credentials: "include",
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `compressed_${result.id}.jpg`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        setError("Failed to download compressed image");
      }
    } catch (err) {
      setError("Failed to download compressed image");
    }
  };

  const reset = () => {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-purple-600 to-blue-600 rounded-full mb-4">
            <FileImage className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Image Compressor
          </h1>
          <p className="text-gray-600">
            Reduce your image size to under 2MB while maintaining quality
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {!file ? (
            /* Upload Area */
            <div
              className={`relative border-2 border-dashed transition-all duration-300 m-6 rounded-xl ${
                dragActive
                  ? "border-purple-500 bg-purple-50"
                  : "border-gray-300 hover:border-purple-400 hover:bg-gray-50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="p-12 text-center">
                <Upload
                  className={`mx-auto w-16 h-16 mb-4 ${
                    dragActive ? "text-purple-500" : "text-gray-400"
                  }`}
                />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                  {dragActive ? "Drop your image here" : "Upload your image"}
                </h3>
                <p className="text-gray-500 mb-6">
                  Drag and drop an image file, or click to browse
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleChange}
                  className="hidden"
                />
              </div>
            </div>
          ) : (
            /* Image Preview and Results */
            <div className="p-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Original Image */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FileImage className="w-5 h-5 mr-2" />
                    Original Image
                  </h3>
                  <div className="relative bg-gray-100 rounded-lg overflow-hidden">
                    <img
                      src={preview}
                      alt="Original"
                      className="w-full h-64 object-contain"
                    />
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">File size:</span>
                      <span className="font-medium">
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm mt-2">
                      <span className="text-gray-600">File name:</span>
                      <span className="font-medium truncate ml-2">
                        {file.name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compressed Result */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                    <FileText className="w-5 h-5 mr-2" />
                    Compressed Image
                  </h3>

                  {!result && !loading && (
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <FileImage className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">
                          Click compress to process
                        </p>
                      </div>
                    </div>
                  )}

                  {loading && (
                    <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <Loader className="w-12 h-12 text-purple-500 mx-auto mb-2 animate-spin" />
                        <p className="text-gray-500">Compressing image...</p>
                      </div>
                    </div>
                  )}

                  {result && (
                    <>
                      <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
                          <p className="text-gray-700 font-medium">
                            Compression Complete!
                          </p>
                        </div>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">New size:</span>
                          <span className="font-medium text-green-700">
                            {formatFileSize(result.compressed_size)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mb-2">
                          <span className="text-gray-600">Size reduction:</span>
                          <span className="font-medium text-green-700">
                            {result.compression_ratio.toFixed(1)}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-600">Status:</span>
                          <span className="font-medium text-green-700">
                            {result.compressed_size <= 2 * 1024 * 1024
                              ? "Under 2MB ✓"
                              : "Compressed"}
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-red-800 font-medium">Error</h4>
                    <p className="text-red-700 text-sm mt-1">{error}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-6 flex flex-wrap gap-3">
                {!result && !loading && (
                  <button
                    onClick={compressImage}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-300 transform hover:scale-105"
                  >
                    <FileImage className="w-5 h-5 mr-2" />
                    Compress Image
                  </button>
                )}

                {result && (
                  <button
                    onClick={downloadCompressed}
                    className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium rounded-lg hover:from-green-700 hover:to-emerald-700 transition-all duration-300 transform hover:scale-105"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download Compressed
                  </button>
                )}

                <button
                  onClick={reset}
                  className="inline-flex items-center px-6 py-3 bg-gray-600 text-white font-medium rounded-lg hover:bg-gray-700 transition-all duration-300"
                >
                  Upload New Image
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="mt-8 grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
              <FileImage className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Smart Compression
            </h3>
            <p className="text-gray-600 text-sm">
              Advanced algorithms reduce file size while maintaining visual
              quality
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Under 2MB Target
            </h3>
            <p className="text-gray-600 text-sm">
              Automatically optimizes images to meet the 2MB size requirement
            </p>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-lg">
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
              <Download className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-800 mb-2">
              Instant Download
            </h3>
            <p className="text-gray-600 text-sm">
              Download your compressed images immediately after processing
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCompressor;
