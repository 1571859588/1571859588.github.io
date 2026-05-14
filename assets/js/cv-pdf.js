/**
 * CV Single-Page PDF Download
 * 
 * Directly captures the visible #cv-content element on the page,
 * then scales the image to fit exactly one A4 page.
 */

function downloadCV(filename) {
  var element = document.getElementById('cv-content');
  if (!element) { alert('CV content not found'); return; }

  // Show loading overlay
  var overlay = document.createElement('div');
  overlay.id = 'pdf-loading-overlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = '<div style="background:#fff;padding:24px 48px;border-radius:8px;font-size:16px;font-family:sans-serif;box-shadow:0 4px 20px rgba(0,0,0,0.3);">正在生成 PDF，请稍候...</div>';
  document.body.appendChild(overlay);

  // Scroll to top to ensure full capture
  window.scrollTo(0, 0);

  setTimeout(function() {
    html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false
    }).then(function(canvas) {
      try {
        // A4 in mm
        var pageW = 210, pageH = 297;
        var mx = 8, my = 6;
        var usableW = pageW - mx * 2;
        var usableH = pageH - my * 2;

        // Scale image to fit one page
        var ratio = canvas.height / canvas.width;
        var imgW = usableW;
        var imgH = imgW * ratio;

        if (imgH > usableH) {
          imgH = usableH;
          imgW = imgH / ratio;
        }

        var offsetX = mx + (usableW - imgW) / 2;

        var imgData = canvas.toDataURL('image/jpeg', 0.92);
        var pdf = new jspdf.jsPDF('portrait', 'mm', 'a4');
        pdf.addImage(imgData, 'JPEG', offsetX, my, imgW, imgH);
        pdf.save(filename + '.pdf');
      } catch (e) {
        console.error('PDF save error:', e);
        alert('PDF生成失败: ' + e.message);
      }
      removeOverlay();
    }).catch(function(err) {
      console.error('html2canvas error:', err);
      removeOverlay();
      alert('PDF生成失败，将使用浏览器打印');
      window.print();
    });
  }, 200);
}

function removeOverlay() {
  var o = document.getElementById('pdf-loading-overlay');
  if (o) o.parentNode.removeChild(o);
}
