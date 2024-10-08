function checkPendingFiles() {
    const rows = document.querySelectorAll('.project-state');
    let mostrarBoton = false;

    rows.forEach(row => {
        if (row.innerHTML.includes('Pendiente')) {
            mostrarBoton = true;
        }
    });

    const assistantRunButton = document.getElementById('assistantRun');
    if (assistantRunButton) {
        assistantRunButton.style.display = mostrarBoton ? 'block' : 'none';
    }
}
function deleteFile(fileId) {
    showSpinner();
    const csrf_token = document.querySelector('input[name="csrf_token"]').value;

    fetch(`/delete-file/${fileId}`, {
        method: 'DELETE',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrf_token // Si estás usando CSRF en tu aplicación
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'success') {
            // Eliminar el elemento visualmente
            const fileRow = document.getElementById(`file-${fileId}`);
            if (fileRow) {
                fileRow.remove();
            }
            showFlashMessage('Archivo eliminado correctamente.', 'success');
            
        } else {
            showFlashMessage('Error al eliminar el archivo: ' + data.message, 'success');
        }
        hideSpinner();
    })
    .catch(error => {
        console.error('Error:', error);
        showFlashMessage('Error al eliminar el archivo', 'success');
        hideSpinner();
        
    });
}

document.addEventListener('DOMContentLoaded', (event) => {
    checkPendingFiles();

    const apiKeyField = document.getElementById('apikey');
    const generateButton = document.getElementById('generateButton') || document.getElementById('copyButton');
    const idField = document.getElementById('id');
    const addFileButton = document.getElementById('addFileButton');
    const fileInput = document.getElementById('customFile');
    const assistantRun = document.getElementById('assistantRun');
    
    if (assistantRun) {
        assistantRun.addEventListener('click', () => {
            showSpinner();
            assistantRun.disabled = true;
            const formData = new FormData();
            formData.append('assistant_id', idField.value);

            fetch('/assistant_run', {
                method: 'POST',
                headers: {
                    "X-CSRFToken": document.querySelector('input[name="csrf_token"]').value,
                },
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const updatedFiles = data.updated_files;
                    updatedFiles.forEach(file => {
                        const row = document.querySelector(`#file-${file.id}`);
                        if (row) {
                            const statusCell = row.querySelector('.project-state');
                            if (statusCell) {
                                statusCell.innerHTML = '<span class="badge badge-success">Success</span>';
                            }
                        }
                    });
                    checkPendingFiles();
                    showFlashMessage('Asistente ejecutado correctamente.', 'success');
                } else {
                    showFlashMessage(data.message || 'Error al ejecutar el asistente.', 'error');
                }
                assistantRun.disabled = false;
                hideSpinner();
            })
            .catch(error => {
                console.error('Error:', error);
                showFlashMessage('Error al ejecutar el asistente.', 'error');
                assistantRun.disabled = false;
                hideSpinner();
            });
        });
    }

    if (addFileButton) {
        addFileButton.addEventListener('click', () => {
            showSpinner();
            addFileButton.disabled = true;
            const formData = new FormData();
            formData.append('assistant_id', idField.value);
            formData.append('file', fileInput.files[0]);
            
            fetch('/assistant_addFile', {
                method: 'POST',
                headers: {
                    "X-CSRFToken": document.querySelector('input[name="csrf_token"]').value,
                },
                body: formData,
                credentials: 'same-origin'
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    const tbody = document.querySelector('#assistantFilesTable tbody');
                    const message = data.message;
                    const file = data.file;
                    const row = document.createElement('tr');
                    row.id = `file-${file.id}`;
        
                    // Construir las URLs dinámicamente
                    const downloadUrl = `/home_blueprint/download_file/${file.id}`;
                    const deleteFunction = `deleteFile('${file.id}')`;
        
                    row.innerHTML = `
                        <td>#</td>
                        <td><a>${file.name}</a><br/><small>${file.created_at}</small></td>
                        <td>${file.type === '.pdf' ? '<i class="far fa-file-pdf"></i>' : '<i class="far fa-file-alt"></i>'}</td>
                        <td class="project_progress"><a>${(file.size / 1048576).toFixed(2)} MB</a></td>
                        <td class="project-state">${file.upload ? '<span class="badge badge-success">Success</span>' : '<span class="badge badge-warning">Pendiente</span>'}</td>
                        <td class="project-actions text-right">
                            <a class="btn btn-primary btn-sm" href="${downloadUrl}">
                                <i class="fas fa-file-download"></i> Descargar
                            </a>
                            <a class="btn btn-danger btn-sm" href="#" onclick="${deleteFunction}">
                                <i class="fas fa-trash-alt"></i> Eliminar
                            </a>
                        </td>
                    `;
        
                    tbody.appendChild(row);
                    showFlashMessage(message, 'success');
                    $('#modal-lg').modal('hide');
                    addFileButton.disabled = false;
                    fileInput.value = '';
                    fileInput.nextElementSibling.innerText = 'Seleccionar archivo';
                    checkPendingFiles();
                } else {
                    showFlashMessage(data.message || 'Error al subir el archivo.', 'error');
                }
                hideSpinner();
            })
            .catch(error => {
                console.error('Error:', error);
                showFlashMessage('Error al subir el archivo.', 'error');
                hideSpinner();
            });
        });
    }

    function copyApiKey() {
        navigator.clipboard.writeText(apiKeyField.value).then(() => {
            showFlashMessage('API Key copiada.', 'success');
        }).catch(err => {
            showFlashMessage('Error al copiar la API Key.', 'error');
        });
    }

    function generateApiKey() {
        showSpinner();
        fetch('/generate_apikey', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                "X-CSRFToken": document.querySelector('input[name="csrf_token"]').value,
            },
            body: JSON.stringify({ assistant_id: idField.value }),
            credentials: 'same-origin'
        })
        .then(response => response.json())
        .then(data => {
            apiKeyField.value = data.apikey;
            generateButton.textContent = 'Copiar';
            generateButton.removeEventListener('click', generateApiKey);
            generateButton.addEventListener('click', copyApiKey);
            hideSpinner();
        })
        .catch(error => showFlashMessage('Error al generar la API Key.', 'error'));
        hideSpinner
    }

    if (generateButton && !apiKeyField.value) {
        generateButton.addEventListener('click', generateApiKey);
    } else if (generateButton && apiKeyField.value) {
        generateButton.addEventListener('click', copyApiKey);
    }

});

$(function () {
    bsCustomFileInput.init();
});
