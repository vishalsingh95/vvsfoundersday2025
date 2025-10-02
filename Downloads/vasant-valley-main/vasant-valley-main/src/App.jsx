import { useState, useRef, useCallback, useEffect } from "react";
import "./App.css";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function App() {
  const [videoEnded, setVideoEnded] = useState(false);
  const [name, setName] = useState("");
  const videoRef = useRef(null);
  const [isDownloading, setIsDownloading] = useState(false);

  // Function to jump to exactly 10 seconds
  const jumpToTenSeconds = useCallback(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 10;

      // Ensure video is playing with audio after user interaction
      videoRef.current.play().catch((error) => {
        console.log("Video play failed:", error);
      });
      userInteraction();
    }
  }, []);

  const userInteraction = useCallback(() => {
    if (videoRef.current) {
      // Unmute the video after user interaction
      videoRef.current.muted = false;

      // Ensure video is playing with audio after user interaction
      videoRef.current.play().catch((error) => {
        console.log("Video play failed:", error);
      });

      // Double-check unmuting after a short delay
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.muted = false;
          videoRef.current.volume = 1.0; // Ensure volume is at maximum
        }
      }, 100);
    }
  }, []);

  // Handle video end
  const handleVideoEnd = useCallback(() => {
    setVideoEnded(true);
  }, []);

  // Handle download button click
  const handleModifyAndDownloadPdf = async () => {
    if (!name.trim()) {
      alert("Please enter a name to download the invitation.");
      return;
    }

    setIsDownloading(true); // Show loading state

    try {
      const existingPdfBytes = await fetch("/Invite.pdf").then((res) =>
        res.arrayBuffer()
      );

      const pdfDoc = await PDFDocument.load(existingPdfBytes);

      const Font = await pdfDoc.embedFont(StandardFonts.TimesRoman);

      const pages = pdfDoc.getPages();
      const firstPage = pages[0];

      const capitalizedName = name
        .split(" ")
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        )
        .join(" ");

      const { width } = firstPage.getSize();
      const fontSize = (82 - Math.floor((capitalizedName.length - 1) / 4) * 2)*0.90;

      const estimatedTextWidth = capitalizedName.length * fontSize * 0.5;
      const dynamicX = (width - estimatedTextWidth) / 2;

      firstPage.drawText(capitalizedName, {
        x: dynamicX,
        y: 1170,
        font: Font,
        size: fontSize,
        color: rgb(0, 0, 0),
      });

      const pdfBytes = await pdfDoc.save();

      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${capitalizedName}_invitation.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up
      URL.revokeObjectURL(link.href);

      // Show personalized success message
      setIsDownloading(false);
      setTimeout(() => {
        alert(`🎉 Downloaded successfully!`);
      }, 500);
    } catch (error) {
      console.error("Error modifying PDF:", error);
      setIsDownloading(false);
      alert("❌ Download failed. Please try again.");
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.addEventListener("ended", handleVideoEnd);

      // Simple iOS autoplay fix - try to play video with audio when loaded
      const handleVideoLoad = async () => {
        try {
          await video.play(); // Try to play video with audio
          console.log("✅ Video autoplay with audio successful");
        } catch (error) {
          console.log("❌ Autoplay blocked, trying muted approach");
          // If autoplay fails, try muted first
          try {
            video.muted = true;
            await video.play();
            console.log(
              "✅ Video playing muted - audio will work after user interaction"
            );
          } catch (mutedError) {
            console.log("❌ Even muted autoplay failed");
          }
        }
      };

      // Try to play when video metadata is loaded
      if (video.readyState >= 1) {
        // If metadata already loaded
        handleVideoLoad();
      } else {
        video.addEventListener("loadedmetadata", handleVideoLoad, {
          once: true,
        }); // Wait for metadata to load before trying to play
      }

      return () => {
        video.removeEventListener("ended", handleVideoEnd);
      };
    }
  }, [handleVideoEnd]);

  useEffect(() => {
    const forceDeviceToLandscape = async () => {
      console.log("🚀 Forcing device to landscape mode...");

      try {
        // Method 1: Request fullscreen first (this often enables orientation lock)
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
          console.log("✅ Entered fullscreen");

          // Small delay to let fullscreen settle
          setTimeout(async () => {
            try {
              await screen.orientation.lock("landscape-primary");
              console.log("✅ Device forced to landscape!");
            } catch (error) {
              console.log("❌ Orientation lock failed even in fullscreen");
            }
          }, 500);
        }
      } catch (error) {
        console.log("❌ Could not force device rotation");
      }
    };

    // Only try on mobile devices
    if (window.innerWidth <= 768) {
      // Try immediately when video loads
      forceDeviceToLandscape();

      // // Retry after delays in case first attempt fails
      // setTimeout(forceDeviceToLandscape, 1000);
      // setTimeout(forceDeviceToLandscape, 3000);
    }

    return () => {
      try {
        // Exit fullscreen and unlock orientation when component unmounts
        if (document.fullscreenElement) {
          document.exitFullscreen();
        }
      } catch (error) {
        console.log("Cleanup failed");
      }
    };
  }, []);

  return (
    <div className="app-container">
      <video
        ref={videoRef}
        src={
          "https://res.cloudinary.com/dvhgc9xbq/video/upload/v1758745634/video_zfayca.mp4"
        }
        autoPlay
        controls={false}
        loop={false}
        muted={false} // Audio enabled by default - let browser handle autoplay policy
        playsInline // Critical for iOS - prevents video opening in native fullscreen player
        webkit-playsinline="true" // Legacy iOS support for inline playback
        className="app-video"
        onClick={userInteraction}
        onTouchStart={userInteraction}
      ></video>
      {!videoEnded && (
        <button
          onClick={jumpToTenSeconds}
          className="app-button"
          onMouseDown={(e) => e.preventDefault()}
        ></button>
      )}
      {videoEnded && (
        <div className="end-screen">
          <div className="end-screen-content">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter name to download invitation...."
              className="text-input"
            />
            <div className="button-group">
              <button
                onClick={handleModifyAndDownloadPdf}
                className="download-button"
                disabled={isDownloading}
              >
                {isDownloading ? "Generating PDF..." : "Download Invitation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
