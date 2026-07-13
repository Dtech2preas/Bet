# Fix it properly by editing the head in app.html
sed -i '/<\/head>/i \
    <style>\
        .swal2-container { z-index: 100000 !important; }\
        .swal2-popup { max-width: 90vw !important; }\
        .swal2-html-container .swal2-input, .swal2-html-container select.swal2-input, .swal2-html-container textarea.swal2-input {\
            margin: 0 !important;\
            margin-top: 0.25rem !important;\
            width: 100% !important;\
            box-sizing: border-box !important;\
        }\
        .swal2-html-container { margin: 1em 1.6em 0.3em; }\
    </style>' app.html
