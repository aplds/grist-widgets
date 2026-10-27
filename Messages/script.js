//Quil

const defaultTheme = "snow";

const toolbarOptions = [
  ['bold', 'italic', 'underline', 'strike', { 'script': 'sub'}, { 'script': 'super' }, { 'color': [] }, { 'background': [] },{ 'align': [] }, 'blockquote', 'code-block', { 'list': 'ordered'}, { 'list': 'bullet' }, { 'list': 'check' }, 'link', 'image', 'formula'],        // toggled buttons

  [{ 'header': [1, 2, 3, 4, 5, 6, false] }, { 'size': ['small', false, 'large', 'huge'] }],

  ['clean'],                                        // remove formatting button
];

let quill = {};

let id;
let column;
let user;
let lastContent;
let editIndex = -1;
let culture = 'en-US';
let labels = {};
localize();
const table = grist.getTable();

function localize() {
  var urlParams = new URLSearchParams(window.location.search);  
  if (urlParams.has('culture')) culture = urlParams.get('culture');

  var lang = culture.split('-')[0];
  switch (lang) {
    case 'fr':
      labels = {
        newTitle: 'Nouveau message',
        editTitle: 'Modifier le message',
        send: 'Envoyer',
        save: 'Enregistrer',
        cancel: 'Annuler',
        edit: 'Modifier',
        remove: 'Supprimer',
        confirmDelete: 'Supprimer ce message ?'
      };
      break;

    case 'es':
      labels = {
        newTitle: 'Nuevo mensaje',
        editTitle: 'Editar mensaje',
        send: 'Enviar',
        save: 'Guardar',
        cancel: 'Cancelar',
        edit: 'Editar',
        remove: 'Eliminar',
        confirmDelete: '¿Eliminar este mensaje?'
      };
      break;

    default:
      labels = {
        newTitle: 'New message',
        editTitle: 'Edit message',
        send: 'Send',
        save: 'Save',
        cancel: 'Cancel',
        edit: 'Edit',
        remove: 'Delete',
        confirmDelete: 'Delete this message?'
      };
  }

  applyComposerLabels();
}

function applyComposerLabels() {
  if (editIndex >= 0) {
    document.getElementById('new-title').innerHTML = labels.editTitle;
    document.getElementById('send').innerHTML = labels.save;
  } else {
    document.getElementById('new-title').innerHTML = labels.newTitle;
    document.getElementById('send').innerHTML = labels.send;
  }
}

function Datereviver(key, value) {
  if (typeof value === 'string') {
    const date = Date.parse(value);
    if (!isNaN(date)) {
      return new Date(date);
    }
  }
  return value;
}

function makeQuill(theme){
  var quillDiv = document.createElement('div');
  quillDiv.id = 'quill';
  document.getElementById('editor').innerHTML = '';
  document.getElementById('editor').appendChild(quillDiv);

  const quill = new Quill('#quill', {
    theme: theme,
    modules: {
      toolbar: toolbarOptions,
      // imageResize: {
      //   displaySize: true
      // }
    }
  });

  // Set up config save callback
  document.getElementById("configuration").addEventListener("submit", async function(event){
    event.preventDefault();
    await saveOptions();
  });

  return quill;
}

// Helper to show or hide panels.
function showPanel(name) {
  document.getElementById("configuration").style.display = 'none';
  document.getElementById("chat").style.display = 'none';
  if(name.length !== 0)
    document.getElementById(name).style.display = '';
}

// Define handler for the Save button.
async function saveOptions() {
  const theme = document.getElementById("quillTheme").value;
  await grist.widgetApi.setOption('quillTheme', theme);
  showPanel('chat');
}

// Subscribe to grist data
grist.ready({requiredAccess: 'full', columns: [{name: 'Messages', type: 'Text'}, {name: 'User', type: 'Text', optional: true}],
  // Register configuration handler to show configuration panel.
  onEditOptions() {
    showPanel('configuration');
  },
});

grist.onRecord(function (record, mappings) {
  quill.enable();
  showPanel('chat');
  // If this is a new record, or mapping is diffrent.
  if (id !== record.id || mappings?.Messages !== column) {
    id = record.id;
    column = mappings?.Messages;
    user = mappings?.User
    const mapped = grist.mapColumnNames(record);
    if (!mapped) {
      // Log but don't bother user - maybe we are just testing.
      console.error('Please map columns');
    } else { //if (lastContent !== mapped.Content) 
      // We will remember last thing sent, to not remove progress.
      msg = mapped.Messages?.replace('|-¤-|','');
      if (!msg || msg.trim().length === 0) {
        lastContent = [];
      } else {
        lastContent = JSON.parse(msg, Datereviver);
      }

      // Cancel any pending edit before (re)loading the thread.
      editIndex = -1;
      document.getElementById('cancel-edit').style.display = 'none';

      //load content
      LoadMesssages(lastContent);
    }
  }
});

grist.onNewRecord(function () {
  document.getElementById('msg-container').innerHTML = '';
  showPanel('');
  id = null;
  lastContent = [];
  editIndex = -1;
  document.getElementById('cancel-edit').style.display = 'none';
  applyComposerLabels();
  quill.setContents(null);
  quill.disable();
})

// Register onOptions handler.
grist.onOptions((customOptions, _) => {
  customOptions = customOptions || {};
  theme = customOptions.quillTheme || defaultTheme;
  document.getElementById("quillTheme").value = theme;
  quill = makeQuill(theme);
  showPanel("chat");
});


function DisplayMessage(author, date, message, index) {
  const card = document.createElement('div');
  card.className = 'card';
  card.dataset.index = index;
  if (!author || author.trim().length === 0) author = '&nbsp' //force blank space to ensure the layout

  card.innerHTML = `
      <div class="card-header">
        <span class="author">${author}</span>
        <span class="date">${date.toLocaleString(culture)}</span>
        <span class="msg-actions">
          <button class="msg-btn" title="${labels.edit}">${labels.edit}</button>
          <button class="msg-btn msg-btn-danger" title="${labels.remove}">${labels.remove}</button>
        </span>
      </div>
      <div class="card-content"><div class="card-message">${message}</div></div>
    `;
  
  card.querySelectorAll('.msg-btn')[0].addEventListener('click', function () { StartEditMessage(index); });
  card.querySelectorAll('.msg-btn')[1].addEventListener('click', function () { DeleteMessage(index); });

  document.getElementById('msg-container').append(card);
}

function LoadMesssages(messages) {
  document.getElementById('msg-container').innerHTML = '';

  let data;
  for (let i = 0; i < messages.length; i++) {
    data = messages[i];
    if (data.length > 2)
      DisplayMessage(data[0], data[1], data[2], i);
  }

  if (editIndex >= 0) MarkEditingCard(editIndex);
}

function MarkEditingCard(index) {
  const cards = document.querySelectorAll('#msg-container .card');
  cards.forEach(function (card) {
    card.classList.toggle('editing', Number(card.dataset.index) === index);
  });
}

function ResetComposerUi() {
  editIndex = -1;
  document.getElementById('cancel-edit').style.display = 'none';
  applyComposerLabels();
  quill.setContents(null);
  MarkEditingCard(-1);
}

function StartEditMessage(index) {
  if (!column || !id) return;
  // A second click on the same message cancels the edit.
  if (editIndex === index) { ResetComposerUi(); return; }

  const entry = lastContent[index];
  if (!entry || entry.length < 3) return;

  editIndex = index;
  // Load the message content into the editor.
  quill.setContents(null);
  quill.clipboard.dangerouslyPasteHTML(entry[2]);
  document.getElementById('new-title').innerHTML = labels.editTitle;
  document.getElementById('send').innerHTML = labels.save;
  document.getElementById('cancel-edit').style.display = '';
  MarkEditingCard(index);
  quill.focus();
}

function CancelEdit() {
  ResetComposerUi();
}

function PersistMessages() {
  table.update({id, fields: {[column]: JSON.stringify(lastContent)}});
}

function SaveEditMessage() {
  if (editIndex < 0 || editIndex >= lastContent.length) {
    ResetComposerUi();
    return;
  }

  const message = quill.getSemanticHTML();
  if (!message || message.trim().length === 0 || message == '<p></p>') return;

  const entry = lastContent[editIndex];
  // Keep original author and date, only the content is updated.
  lastContent[editIndex] = [entry[0], entry[1], message];

  PersistMessages();
  LoadMesssages(lastContent);
  ResetComposerUi();
}

function DeleteMessage(index) {
  if (index < 0 || index >= lastContent.length) return;
  if (!window.confirm(labels.confirmDelete)) return;

  if (editIndex === index) {
    // The message being edited is removed: cancel the edit session.
    ResetComposerUi();
  } else if (editIndex > index) {
    // Keep the edit session aligned after the removal.
    editIndex = editIndex - 1;
  }

  lastContent.splice(index, 1);
  PersistMessages();
  LoadMesssages(lastContent);
}

function AddMessage(author, date, message){
  //Display the message
  DisplayMessage(author, date, message, lastContent.length);    
    
  //Update the table
  lastContent.push([author, date, message]);  
  table.update({id, fields: {[column]: JSON.stringify(lastContent)}});
}

function AddNewMessage() {
  // If we are editing an existing message, save the edition instead.
  if (editIndex >= 0) {
    SaveEditMessage();
    return;
  }

  // If we are mapped.
  if (column && id) {  
    let author = '';
    
    //Prepare data
    let date = new Date();
    const message = quill.getSemanticHTML();

    if (!message || message.trim().length === 0 || message == '<p></p>') return;

    //update table to refresh user
    if (!user || user.trim().length !== 0) {
      table.update({id, fields: {[column]: JSON.stringify(lastContent)+'|-¤-|'}}).then((result)=> {
        grist.fetchSelectedRecord(id).then((row)=> {
          author = row[user];
          //Display message
          AddMessage(author, date, message);
          //reset editor
          quill.setContents(null);

        }, (error) => {console.error(error)});      
      }, (error) => {console.error(error)});
    } else {
      //Display message
      AddMessage(author, date, message);
      //reset editor
      quill.setContents(null);
    }    
  }  
}
