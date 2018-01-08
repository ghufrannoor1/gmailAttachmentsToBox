var CLIENTID = PropertiesService.getScriptProperties().getProperty('CLIENTID');
var CLIENTSECRET = PropertiesService.getScriptProperties().getProperty('CLIENTSECRET');
var SERVICEAUTHBASEURL = PropertiesService.getScriptProperties().getProperty('SERVICEAUTHBASEURL');
var TOKENBASEURL = "https://api.box.com/oauth2/token";
var ANTIFORGERYMESSAGE = PropertiesService.getScriptProperties().getProperty('ANTIFORGERYMESSAGE');
var ENCODINGPREFIX = "=";
var ROOTFOLDERURL = 'https://api.box.com/2.0/folders/0'
var UPLOADURL = 'https://upload.box.com/api/2.0/files/content'
var NEWFOLDERURL = 'https://api.box.com/2.0/folders'

/**
 * Attempts to access a non-Google API using a constructed service
 * object.
 *
 * If your add-on needs access to non-Google APIs that require OAuth,
 * you need to implement this method. You can use the OAuth1 and
 * OAuth2 Apps Script libraries to help implement it.
 *
 * @param {String} url         The URL to access.
 * @param {String} method_opt  The HTTP method. Defaults to GET.
 * @param {Object} headers_opt The HTTP headers. Defaults to an empty
 *                             object. The Authorization field is added
 *                             to the headers in this method.
 * @returns {HttpResponse} the result from the UrlFetchApp.fetch() call.
 */

function accessProtectedResource(baseAuthUrl, payloads_opt, contentType_opt, method_opt, headers_opt) {
  var service = getOAuthService();
  var url = baseAuthUrl;
  var maybeAuthorized = service.hasAccess();
  if (maybeAuthorized) {
    // A token is present but it may be expired or invalid. Make a
    // request and check the response code to be sure.

    // Make the UrlFetch request and return the result.
    var accessToken = service.getAccessToken();
    var method = method_opt || "get";
    var headers = headers_opt || {};
    var payload = payloads_opt || {};
    var contentType = contentType_opt || "";
    headers["Authorization"] =
      Utilities.formatString("Bearer %s", accessToken);
    var resp = UrlFetchApp.fetch(url, {
      'headers' : headers,
      'method'  : method,
      'payload' : payload,
      'contentType' : contentType,
      'muteHttpExceptions' : true, // Prevents thrown HTTP exceptions
    });



    var code = resp.getResponseCode();
    if (code >= 200 && code < 300) {
      return resp.getContentText("utf-8"); // Success
    } else if (code == 401 || code == 403) {
      // Not fully authorized for this action.
      maybeAuthorized = false;
    } else if (code == 409) {
      return resp.getResponseCode()
    }
    else {
      // Handle other response codes by logging them and throwing an
      // exception.
      console.error("Backend server error (%s): %s", code.toString(),
                   resp.getContentText("utf-8"));
      throw("Backend server error: " + code);
    }
  }

  if (!maybeAuthorized) {
    // Invoke the authorization flow using the default authorization
    // prompt card.
    CardService.newAuthorizationException()
        .setAuthorizationUrl(service.getAuthorizationUrl())
        .setResourceDisplayName("Display name to show to the user")
        .throwException();
  }
}

/**
 * Create a new OAuth service to facilitate accessing an API.
 * This example assumes there is a single service that the add-on needs to
 * access. Its name is used when persisting the authorized token, so ensure
 * it is unique within the scope of the property store. You must set the
 * client secret and client ID, which are obtained when registering your
 * add-on with the API.
 *
 * See the Apps Script OAuth2 Library documentation for more
 * information:
 *   https://github.com/googlesamples/apps-script-oauth2#1-create-the-oauth2-service
 *
 *  @returns A configured OAuth2 service object.
 */

function getOAuthService() {
  return OAuth2.createService('GMAILTOBOX')
      .setAuthorizationBaseUrl(prepareAuthUrl(SERVICEAUTHBASEURL))
      .setTokenUrl(TOKENBASEURL)
      .setClientId(CLIENTID)
      .setClientSecret(CLIENTSECRET)
      .setCallbackFunction('authCallback')
      .setCache(CacheService.getUserCache())
      .setPropertyStore(PropertiesService.getUserProperties());
}

/**
 * Boilerplate code to determine if a request is authorized and returns
 * a corresponding HTML message. When the user completes the OAuth2 flow
 * on the service provider's website, this function is invoked from the
 * service. In order for authorization to succeed you must make sure that
 * the service knows how to call this function by setting the correct
 * redirect URL.
 *
 * The redirect URL to enter is:
 * https://script.google.com/macros/d/<Apps Script ID>/usercallback
 *
 * See the Apps Script OAuth2 Library documentation for more
 * information:
 *   https://github.com/googlesamples/apps-script-oauth2#1-create-the-oauth2-service
 *
 *  @param {Object} callbackRequest The request data received from the
 *                  callback function. Pass it to the service's
 *                  handleCallback() method to complete the
 *                  authorization process.
 *  @returns {HtmlOutput} a success or denied HTML message to display to
 *           the user. Also sets a timer to close the window
 *           automatically.
 */

function authCallback(callbackRequest) {
  var service = getOAuthService();
  var authorized = service.handleCallback(callbackRequest);
  if (authorized) {
    return HtmlService.createHtmlOutput(
       'Success! <script>setTimeout(function() { top.window.close() }, 1);</script>');
  } else {
    return HtmlService.createHtmlOutput('Denied');
  }
}

/**
 * Unauthorizes the non-Google service. This is useful for OAuth
 * development/testing.  Run this method (Run > resetOAuth in the script
 * editor) to reset OAuth to re-prompt the user for OAuth.
 */

function resetOAuth() {
  var service = getOAuthService();
  service.reset();
}

/**
 * Returns an array of cards that comprise the customized authorization
 * prompt. Includes a button that opens the proper authorization link
 * for a non-Google service.
 *
 * When creating the text button, using the
 * setOnClose(CardService.OnClose.RELOAD_ADD_ON) function forces the add-on
 * to refresh once the authorization flow completes.
 *
 * @returns {Card[]} The card representing the custom authorization prompt.
 */

function createBoxAuthorizationUi() {
  var service = getOAuthService();
  var authUrl = service.getAuthorizationUrl();
  var authButton = CardService.newTextButton()
      .setText('Begin Authorization')
      .setAuthorizationAction(CardService.newAuthorizationAction()
          .setAuthorizationUrl(authUrl));

  var promptText =
      'To push attachments to Box.com, this add-on needs authorization to:' +
      '<ul>Read and write to your Box.com account<ul>.';

  var card = CardService.newCardBuilder()
      .setHeader(CardService.newCardHeader()
          .setTitle('Authorization Required'))
      .addSection(CardService.newCardSection()
          .setHeader('This add-on needs access to your Box.com account.')
          .addWidget(CardService.newTextParagraph()
              .setText(promptText))
          .addWidget(CardService.newButtonSet()
              .addButton(authButton)))
      .build();
  return [card];
}

function getBoxAuthorizationUrls() {
  accessProtectedResource(SERVICEAUTHBASEURL);
}

function prepareAuthUrl(baseAuthUrl) {
  var encryptedMessage = encryption(ANTIFORGERYMESSAGE, 'E');
  var messagePreparedForEncoding = ENCODINGPREFIX.concat(encryptedMessage);
  var encodedMessage = encodeURIComponent(messagePreparedForEncoding);
  var encodedUrl = baseAuthUrl.concat(encodedMessage);
  return encodedUrl;
}

function encryption(message, choice) {
  var key = Session.getTemporaryActiveUserKey();
  var cypher = new cCryptoGS.Cipher(key, 'aes');

  if (choice == 'E') {
    var encryptedMessage = cypher.encrypt(message);
    return encryptedMessage
  } else if (choice == 'D') {
    var decryptedMessage = cypher.decrypt(message);
    return decryptedMessage
  }
}

function testUrlFetch() {
  var response = UrlFetchApp.fetch("http://www.google.com/");
}

function testOAuthCreation() {
  getBoxAuthorizationUrls();
}