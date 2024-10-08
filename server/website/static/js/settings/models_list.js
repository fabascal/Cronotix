
$(function () {
$("#models-data").DataTable({
    "responsive": true, "lengthChange": false, "autoWidth": false,
    "buttons": ["copy", "csv", "excel", "pdf", "print", "colvis"]
}).buttons().container().appendTo('#example1_wrapper .col-md-6:eq(0)');

});

document.addEventListener("DOMContentLoaded", function() {
    const rows = document.querySelectorAll('#models-data tbody tr');
    rows.forEach(row => {
        row.addEventListener('click', function() {
            const url = this.getAttribute('data-url');
            if (url) {
                window.location.href = url;
            }
        });
    });
});
