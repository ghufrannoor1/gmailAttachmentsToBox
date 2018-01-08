function buildUi(e) {
  var accessToken = e.messageMetadata.accessToken;
  GmailApp.setCurrentMessageAccessToken(accessToken);

  var messageId = e.messageMetadata.messageId;
  var currentMessage = GmailApp.getMessageById(messageId)

  var attachments = currentMessage.getAttachments();

  var chooseAttachmentsButton = CardService.newTextButton()
      .setText('Choose Attachments')
      .setOnClickAction(CardService.newAction()
          .setFunctionName('buildChooseAttachmentsInterface'));

  var attachmentsNotFoundText = 'To Use the Push Gmail Attachments to Box.com Add-on, please open an email with attachments.'

  if (attachments.length > 0) {
    var card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
            .setTitle('Choose Attachments to Push to Box.com'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newButtonSet()
                .addButton(chooseAttachmentsButton)))
        .build();
    return [card];
  }

  else {
    var card = CardService.newCardBuilder()
        .setHeader(CardService.newCardHeader()
            .setTitle('No Attachments Found'))
        .addSection(CardService.newCardSection()
            .addWidget(CardService.newTextParagraph()
                .setText(attachmentsNotFoundText)))
        .build();
    return [card];
  }
}

function buildChooseAttachmentsInterface(e) {

  var messageId = e.messageMetadata.messageId;
  var currentMessage = GmailApp.getMessageById(messageId)

  var attachments = currentMessage.getAttachments();

  var choices = JSON.stringify(fillChoicesArray(attachments.length));

  var selectionInput = CardService.newSelectionInput()
      .setType(CardService.SelectionInputType.CHECK_BOX)
      .setTitle('Choose attachments to push to Box.com')
      .setFieldName('attachment_selection');

  var cache = CacheService.getUserCache();
  var key = "item"

  for(i = 0; i < attachments.length; i++) {
    var idKey = key + i.toString();
    Logger.log(idKey);
    cache.put(idKey, false);
    selectionInput.addItem(attachments[i].getName(), key + i.toString(), false)
    .setOnChangeAction(CardService.newAction()
       .setFunctionName('storeUserChoices')
       .setParameters({'numChoices' : attachments.length.toString()}));
  }

  var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
          .setTitle('Choose Attachments'))
      .addSection(CardService.newCardSection()
          .addWidget(selectionInput)
          .addWidget(CardService.newButtonSet()
              .addButton(CardService.newTextButton()
              .setText('Push To Box.com')
              .setOnClickAction(CardService.newAction()
                  .setFunctionName('initPushAttachments')))))
      .build();

  var nav = CardService.newNavigation().pushCard(card);

  return CardService.newActionResponseBuilder()
      .setNavigation(nav)
      .build();
}

function fillChoicesArray(length) {
  var arr = [];
  for(i = 0; i < length; i++) {
    arr[i] = false;
  }
  return arr;
}

function storeUserChoices(idObject) {
  Logger.log(idObject);
  var choices = idObject.formInputs['attachment_selection'];
  Logger.log(choices);
  var numChoices = parseInt(idObject.parameters['numChoices'])
  var cache = CacheService.getUserCache();
  var key = "item";
  for(i = 0; i < numChoices; i++) {
    var keyId = key + i.toString();
    if((choices != null) && (choices.indexOf(keyId) != -1)) {
      cache.put(keyId, true);
    }
    else {
      cache.put(keyId, false);
    }
  }

}