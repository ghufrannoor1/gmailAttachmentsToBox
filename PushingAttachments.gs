function initPushAttachments(e) {
  var messageId = e.messageMetadata.messageId
  var message = GmailApp.getMessageById(messageId);
  var attachments = message.getAttachments();
  var choices = getChoices(attachments.length);
  if(madeChoices(choices)) {
    Logger.log('Home Stretch!')

    var attachmentsToSend = [];

    var messageSubject = message.getSubject();
    var newFolderName = 'Gmail Attachments - Msg: ' + messageSubject
    var newFolderDetails = '{\"name\":\"' + newFolderName + '\", \"parent\": {\"id\":\"0\"}}';
    var newFolder = accessProtectedResource(NEWFOLDERURL, newFolderDetails);

    if(newFolder == 409) {
      var card = CardService.newCardBuilder()
          .setHeader(CardService.newCardHeader()
              .setTitle('Duplicate Files'))
          .addSection(CardService.newCardSection()
              .addWidget(CardService.newTextParagraph()
                  .setText('These files were already uploaded to Box.com.')))
          .build()

      var nav = CardService.newNavigation().pushCard(card);

      return CardService.newActionResponseBuilder()
          .setNavigation(nav)
          .build();

    }

    var newFolderId = JSON.parse(newFolder)['id'];
    var requests = [];
    var j = 0;

    for(i = 0; i < attachments.length; i++) {
      if(choices[i]) {
        var boundary = "gmailtobox";
        var blob = attachments[i];

        var attributes = '{\"name":\"' + blob.getName() + '\", \"parent\":{\"id\":\"' + newFolderId + '\"}}';

        var requestBody = Utilities.newBlob(
            "--"+boundary+"\r\n"
            + "Content-Disposition: form-data; name=\"attributes\"\r\n\r\n"
            + attributes+"\r\n"+"--"+boundary+"\r\n"
            + "Content-Disposition: form-data; name=\"file\"; filename=\""+blob.getName()+"\"\r\n"
            + "Content-Type: " + blob.getContentType()+"\r\n\r\n").getBytes()
            .concat(blob.getBytes())
            .concat(Utilities.newBlob("\r\n--"+boundary+"--\r\n").getBytes());

        var contentType = "multipart/form-data; boundary=" + boundary;

        requests[j] = accessProtectedResource(UPLOADURL, requestBody, contentType, 'post')
      }
    }

    var newFolderUrl = 'https://app.box.com/folder/' + newFolderId;

    var card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
            .setTitle('Success!'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('Click the button below to go to access your files on Box.com.'))
            .addWidget(CardService.newButtonSet()
                .addButton(CardService.newTextButton()
                    .setText('Go To Box.com')
                    .setOpenLink(CardService.newOpenLink()
                        .setUrl(newFolderUrl)
                        .setOpenAs(CardService.OpenAs.FULL_SIZE)
                        .setOnClose(CardService.OnClose.NOTHING)))))
        .build();

    var nav = CardService.newNavigation().pushCard(card);

    return CardService.newActionResponseBuilder()
        .setNavigation(nav)
        .build();
  }

  else {
    Logger.log('Lets go back!');
    var card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
            .setTitle('No Attachments Selected!'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText('Click the back button to return to choices screen.')))
        .build();

    var nav = CardService.newNavigation().pushCard(card);

    return CardService.newActionResponseBuilder()
        .setNavigation(nav)
        .build();
  }

}

function getChoices(attachmentsLength) {
  var key = "item";
  var choices = [];

  var cache = CacheService.getUserCache();

  for(i = 0; i < attachmentsLength; i++) {
    choices[i] = JSON.parse(cache.get(key + i.toString()))
  }

  Logger.log(choices);
  return choices;
};

function madeChoices(choicesArray) {
  Logger.log(choicesArray);
  Logger.log(typeof(choicesArray));
  Logger.log(choicesArray[0]);
  var result = choicesArray.indexOf(true);
  Logger.log(result);
  if(result != -1) {
    return true;
  }

  else {
    return false;
  }
}

function checkBoxRootFolder() {
  var req = accessProtectedResource('https://api.box.com/2.0/folders/0');
  Logger.log(JSON.parse(req)['item_collection']['entries'][0]['name']);
}

function createNewBoxFolderInRootFolder() {
  var req = accessProtectedResource('https://api.box.com/2.0/folders', '{"name":"TestFolder", "parent": {"id": "0"}}');
  Logger.log(JSON.parse(req)['id']);
  Logger.log(typeof(JSON.parse(req)['id']));
}