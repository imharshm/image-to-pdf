import React, { useCallback, useEffect, useRef, useState } from "react";
import jsPDF from "jspdf";
import "./index.css";

const ImgToPdf = () => {
  const [files, setFiles] = useState([]);
  const inputRef = useRef(null);
  const dropRef = useRef(null);

  useEffect(() => {
    return () => {
      files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    };
  }, [files]);

  const onFilesAdded = useCallback((fileList) => {
    const newFiles = Array.from(fileList)
      .filter((f) => f.type.startsWith("image/"))
      .map((f) => ({
        id: `${Date.now()}-${Math.random()}`, // stable unique id
        file: f,
        previewUrl: URL.createObjectURL(f),
        name: f.name,
      }));

    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const handleInputChange = (e) => {
    onFilesAdded(e.target.files);
    e.target.value = null;
  };

  const handleDrop = (e) => {
    e.preventDefault();
    onFilesAdded(e.dataTransfer.files);
    dropRef.current.classList.remove("drag-over");
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    dropRef.current.classList.add("drag-over");
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropRef.current.classList.remove("drag-over");
  };

  const removeAt = (index) => {
    setFiles((prev) => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[index].previewUrl);
      copy.splice(index, 1);
      return copy;
    });
  };

  const move = (from, to) => {
    setFiles((prev) => {
      const copy = [...prev];
      if (to < 0 || to >= copy.length) return copy;
      const [item] = copy.splice(from, 1);
      copy.splice(to, 0, item);
      return copy;
    });
  };

  const fileToDataUrl = (file) =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const handleDownloadPDF = async () => {
    if (files.length === 0) {
      alert("Please add at least one image.");
      return;
    }

    const pdf = new jsPDF({ unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();

    for (let i = 0; i < files.length; i++) {
      const f = files[i].file;
      try {
        const dataUrl = await fileToDataUrl(f);

        await new Promise((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const iw = img.width;
            const ih = img.height;
            const aspect = iw / ih;

            let renderW = pageW;
            let renderH = pageW / aspect;
            if (renderH > pageH) {
              renderH = pageH;
              renderW = pageH * aspect;
            }

            const x = (pageW - renderW) / 2;
            const y = (pageH - renderH) / 2;

            pdf.addImage(dataUrl, "JPEG", x, y, renderW, renderH);

            if (i < files.length - 1) pdf.addPage();
            resolve();
          };
          img.onerror = () => reject(new Error("Image load error"));
          img.src = dataUrl;
        });
      } catch (err) {
        console.error("Failed to process file", f.name, err);
        alert("Failed to process file: " + f.name);
      }
    }

    pdf.save("images-to-pdf.pdf");
  };

  const clearAll = () => {
    files.forEach((f) => URL.revokeObjectURL(f.previewUrl));
    setFiles([]);
  };

  return (
    <div className="app-root">
      <header className="header">
        <h1>Image → PDF Converter</h1>
        <p className="subtitle">
          Upload images (drag & drop or click). Reorder, remove and convert to a single PDF (A4).
        </p>
      </header>

      <main>
        <section
          className="dropzone"
          ref={dropRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleInputChange}
            style={{ display: "none" }}
          />
          <div className="dropzone-content">
            <strong>Drop images here</strong>
            <span>or click to browse</span>
          </div>
        </section>

        <section className="controls">
          harshal
          <button onClick={handleDownloadPDF} className="primary" disabled={files.length === 0}>
            Download PDF
          </button>
          <button onClick={clearAll} className="outline">
            Clear All
          </button>
        </section>

        <section className="thumbnails">
          {files.length === 0 && <div className="empty">No images yet — add some files.</div>}

          {files.map((item, idx) => (
            <div className="thumb" key={item.id}>
              <img src={item.previewUrl} alt={item.name} />
              <div className="thumb-footer">
                <div className="filename" title={item.name}>
                  {item.name}
                </div>
                <div className="thumb-actions">
                  <button onClick={() => move(idx, idx - 1)} title="Move left">
                    ◀
                  </button>
                  <button onClick={() => move(idx, idx + 1)} title="Move right">
                    ▶
                  </button>
                  <button onClick={() => removeAt(idx)} title="Remove">
                    ✖
                  </button>
                </div>
              </div>
            </div>
          ))}
        </section>

        <footer className="footer">
          <small>
            Built with React + jsPDF · Works in modern browsers. Images are processed in-memory on
            your machine.
          </small>
        </footer>
      </main>
    </div>
  );
};

export default ImgToPdf;
