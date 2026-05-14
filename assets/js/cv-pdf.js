/**
 * CV Single-Page PDF Download
 * 
 * Captures #cv-content as a canvas image, scales it to fit exactly one A4 page.
 */

function downloadCV(filename) {
  var element = document.getElementById('cv-content');
  if (!element) { alert('CV content not found'); return; }

  // Show loading overlay
  var overlay = document.createElement('div');
  overlay.innerHTML = '<div style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;"><div style="background:#fff;padding:24px 48px;border-radius:8px;font-size:16px;font-family:sans-serif;">正在生成 PDF，请稍候...</div></div>';
  document.body.appendChild(overlay);

  // Clone the CV content
  var clone = element.cloneNode(true);
  
  // Create off-screen wrapper with fixed width
  var wrapper = document.createElement('div');
  wrapper.style.cssText = 'position:absolute;left:-9999px;top:0;width:780px;background:#fff;padding:10px 14px;box-sizing:border-box;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans SC",sans-serif;';
  
  applyCompactStyles(clone);
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Small delay to let DOM render
  setTimeout(function() {
    html2canvas(wrapper, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff'
    }).then(function(canvas) {
      document.body.removeChild(wrapper);

      // A4 dimensions in mm
      var pageW = 210, pageH = 297;
      var mx = 8, my = 6;
      var usableW = pageW - mx * 2;
      var usableH = pageH - my * 2;

      // Calculate image dimensions to fit on one page
      var ratio = canvas.height / canvas.width;
      var imgW = usableW;
      var imgH = imgW * ratio;

      // If too tall, scale down to fit height
      if (imgH > usableH) {
        imgH = usableH;
        imgW = imgH / ratio;
      }

      // Center horizontally
      var offsetX = mx + (usableW - imgW) / 2;

      var imgData = canvas.toDataURL('image/jpeg', 0.92);
      var pdf = new jspdf.jsPDF('portrait', 'mm', 'a4');
      pdf.addImage(imgData, 'JPEG', offsetX, my, imgW, imgH);
      pdf.save(filename + '.pdf');

      document.body.removeChild(overlay);
    }).catch(function(err) {
      document.body.removeChild(overlay);
      if (document.body.contains(wrapper)) document.body.removeChild(wrapper);
      console.error('PDF generation failed:', err);
      alert('PDF生成失败，将使用浏览器打印');
      window.print();
    });
  }, 100);
}

/**
 * Apply compact inline styles for PDF rendering.
 */
function applyCompactStyles(el) {
  el.style.cssText = 'font-size:11px;line-height:1.3;color:#333;max-width:100%;';

  var s = el.querySelectorAll('.cv-section-title');
  for (var i = 0; i < s.length; i++)
    s[i].style.cssText = 'font-size:14px;font-weight:600;margin:7px 0 3px;padding-bottom:2px;border-bottom:2px solid #52adc8;color:#333;';

  var n = el.querySelector('.cv-name');
  if (n) n.style.cssText = 'font-size:20px;font-weight:700;margin:0 0 4px;padding:0;text-align:center;border:none;';

  var h = el.querySelector('.cv-header');
  if (h) h.style.cssText = 'display:flex;align-items:flex-start;gap:12px;margin-bottom:6px;padding-bottom:5px;border-bottom:3px solid #52adc8;';

  var p = el.querySelector('.cv-photo img');
  if (p) p.style.cssText = 'width:70px;height:90px;object-fit:cover;border:1px solid #ddd;';

  var c = el.querySelector('.cv-contact');
  if (c) c.style.cssText = 'display:flex;flex-wrap:wrap;gap:3px 12px;margin-bottom:2px;font-size:10px;color:#666;';

  var entries = el.querySelectorAll('.cv-entry');
  for (var i = 0; i < entries.length; i++)
    entries[i].style.cssText = 'margin-bottom:3px;padding-bottom:1px;';

  var eh = el.querySelectorAll('.cv-entry-header');
  for (var i = 0; i < eh.length; i++)
    eh[i].style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:1px;gap:4px;';

  var d = el.querySelectorAll('.cv-date');
  for (var i = 0; i < d.length; i++)
    d[i].style.cssText = 'font-size:10px;color:#888;white-space:nowrap;';

  var ec = el.querySelectorAll('.cv-entry-content');
  for (var i = 0; i < ec.length; i++)
    ec[i].style.cssText = 'font-size:10.5px;line-height:1.3;color:#333;';

  var lists = el.querySelectorAll('.cv-list');
  for (var i = 0; i < lists.length; i++) {
    lists[i].style.cssText = 'margin:0;padding-left:16px;';
    var li = lists[i].querySelectorAll('li');
    for (var j = 0; j < li.length; j++)
      li[j].style.cssText = 'margin-bottom:1px;line-height:1.25;font-size:10.5px;';
  }

  var hl = el.querySelectorAll('.cv-highlights');
  for (var i = 0; i < hl.length; i++) {
    hl[i].style.cssText = 'margin:2px 0 0;padding-left:16px;';
    var li = hl[i].querySelectorAll('li');
    for (var j = 0; j < li.length; j++)
      li[j].style.cssText = 'margin-bottom:1px;line-height:1.25;font-size:10px;';
  }

  var pubs = el.querySelectorAll('.cv-publication .cv-entry-content');
  for (var i = 0; i < pubs.length; i++)
    pubs[i].style.cssText = 'font-size:10.5px;line-height:1.25;';

  var cont = el.querySelectorAll('.cv-contribution');
  for (var i = 0; i < cont.length; i++)
    cont[i].style.cssText = 'margin-top:2px;padding:3px 6px;font-size:10px;background:#f8f9fa;border-left:2px solid #52adc8;';

  var links = el.querySelectorAll('a');
  for (var i = 0; i < links.length; i++)
    links[i].style.cssText = 'color:#333;text-decoration:none;';
}
