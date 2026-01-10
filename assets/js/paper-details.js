/* ==========================================================================
   Paper Details Toggle
   ========================================================================== */

// Check if showPaperDetails is saved in localStorage
var showPaperDetails = localStorage.getItem('showPaperDetails') === 'true';

// Update checkbox state on page load
$(document).ready(function() {
  $('#show-paper-details').prop('checked', showPaperDetails);
  togglePaperDetails();
});

// Handle checkbox change
$('#show-paper-details').on('change', function() {
  showPaperDetails = $(this).prop('checked');
  localStorage.setItem('showPaperDetails', showPaperDetails);
  togglePaperDetails();
});

// Toggle paper details visibility
function togglePaperDetails() {
  if (showPaperDetails) {
    $('.paper-details').slideDown(200);
  } else {
    $('.paper-details').slideUp(200);
  }
}
