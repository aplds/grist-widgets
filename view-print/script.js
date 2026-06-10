var tableId = null;
var rowId = null;
var colId = null;
var cachedData = null;
var previewElement = null;
var printBtn = null;

// Fonction pour afficher les erreurs
function showError(msg) {
    var el = document.getElementById('error');
    if (!msg) {
        el.style.display = 'none';
    } else {
        el.innerHTML = msg;
        el.style.display = 'block';
    }
}

// Fonction pour rendre le Markdown
function renderMarkdown(content) {
    if (!previewElement) {
        previewElement = document.getElementById('preview');
    }
    var html = marked.parse(content || '');
    var cleanHtml = DOMPurify.sanitize(html, { FORCE_BODY: true });
    previewElement.innerHTML = cleanHtml;
}

// Fonction pour attendre que les images soient chargées
function waitForImages(element) {
    const images = element.querySelectorAll('img');
    if (images.length === 0) {
        return Promise.resolve();
    }

    return Promise.all(
        Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // Résoudre même en cas d'erreur
            });
        })
    );
}

// Fonction pour imprimer via le dialogue natif du navigateur
async function printContent() {
    if (!previewElement) {
        previewElement = document.getElementById('preview');
    }

    // Masquer temporairement le bouton d'impression
    const printButton = document.getElementById('printBtn');
    printButton.style.display = 'none';

    try {
        // Attendre que les images soient chargées
        await waitForImages(previewElement);

        // Créer une nouvelle fenêtre avec le contenu à imprimer
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            showError("Le navigateur a bloqué l'ouverture de la fenêtre d'impression. Veuillez autoriser les pop-ups pour ce site.");
            return;
        }

        // Créer un document HTML complet pour l'impression
        const printContent = `
        <!DOCTYPE html>
        <html>
        <head>
        <meta charset="UTF-8">
        <title>Impression - Ligne ${rowId}</title>
        <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.4;
            color: #333;
            margin: 0;
            padding: 20mm; /* Marges pour l'impression */
        }
        img {
            max-width: 100% !important;
            height: auto !important;
        }
        code {
            background-color: #dfe9ff;
            padding: 0 4px;
            border-radius: 4px;
            color: black;
        }
        blockquote {
            border-left: 4px solid #ddd;
            margin: 0;
            padding: 0 1rem;
            color: #666;
        }
        pre {
            background-color: #eef3ff;
            padding: 8px;
            border-radius: 4px;
            overflow-x: auto;
        }
        table {
            margin: 2rem 0;
            border-spacing: 0;
            border: 1px solid lightgrey;
            border-left: none;
            border-top: none;
            width: 100%;
        }
        table th, table td {
            border: 1px solid lightgrey;
            padding: 0.5rem 1rem;
            border-right: none;
            border-bottom: none;
        }
        @media print {
            body {
                padding: 10mm; /* Marges réduites pour l'impression */
            }
        }
        </style>
        </head>
        <body>
        ${previewElement.innerHTML}
        <script>
        window.onload = function() {
            window.print();
            // Fermer la fenêtre après l'impression (optionnel)
            // window.onafterprint = function() { window.close(); };
        };
        <\/script>
        </body>
        </html>
        `;

        // Écrire le contenu dans la nouvelle fenêtre
        printWindow.document.open();
        printWindow.document.write(printContent);
        printWindow.document.close();

    } catch (error) {
        console.error("Erreur lors de l'impression :", error);
        showError("Une erreur est survenue lors de l'impression. Veuillez réessayer.");
    } finally {
        // Réafficher le bouton d'impression
        printButton.style.display = 'flex';
    }
}

// Initialisation du widget
function ready(fn) {
    if (document.readyState !== 'loading') {
        fn();
    } else {
        document.addEventListener('DOMContentLoaded', fn);
    }
}

ready(() => {
    previewElement = document.getElementById('preview');
    printBtn = document.getElementById('printBtn');

    printBtn.addEventListener('click', printContent);

    grist.ready({
        columns: [{ name: "Content", type: 'Text' }],
        requiredAccess: 'read table'
    });

    grist.on('message', (e) => {
        if (e.tableId) {
            tableId = e.tableId;
        }
    });

    grist.onRecord(function(record, mappings) {
        var keys = Object.keys(record);
        rowId = record.id;
        delete record.id;

        if (!mappings) {
            if (keys.length !== 1) {
                showError("Veuillez sélectionner une colonne pour afficher le contenu.");
                return;
            }
            colId = keys[0];
        } else if (mappings) {
            if (!mappings.Content) {
                showError("Veuillez sélectionner une colonne pour afficher le contenu.");
                return;
            }
            colId = mappings.Content;
        }

        showError(null);
        var data = record[colId] || '';
        if (data !== cachedData) {
            renderMarkdown(data);
            cachedData = data;
        }
    });

    grist.onNewRecord(() => {
        previewElement.innerHTML = '';
        cachedData = null;
    });
});
