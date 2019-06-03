var ScribeSpeak;
var token;
var TIME_ELAPSED;
var FULL_RECO;
var PARTIAL_RECO;
var TIMEOUT_SEC = 10000;

exports.init = function () {
    info('[ GoogleMeteo ] is initializing ...');
}

exports.action = function(data, callback){

	ScribeSpeak = SARAH.ScribeSpeak;

	FULL_RECO = SARAH.context.scribe.FULL_RECO;
	PARTIAL_RECO = SARAH.context.scribe.PARTIAL_RECO;
	TIME_ELAPSED = SARAH.context.scribe.TIME_ELAPSED;

	SARAH.context.scribe.activePlugin('GoogleMeteo');

	var util = require('util');
	console.log("GoogleMeteo call log: " + util.inspect(data, { showHidden: true, depth: null }));

	SARAH.context.scribe.hook = function(event) {
		checkScribe(event, data.action, callback, data); 
	};
	
	token = setTimeout(function(){
		SARAH.context.scribe.hook("TIME_ELAPSED");
	}, TIMEOUT_SEC);
}

function checkScribe(event, action, callback, data) {

	if (event == FULL_RECO) {
		clearTimeout(token);
		SARAH.context.scribe.hook = undefined;
		// aurait-on trouvé ?
		decodeScribe(SARAH.context.scribe.lastReco, callback, data);

	} else if(event == TIME_ELAPSED) {
		// timeout !
		SARAH.context.scribe.hook = undefined;
		// aurait-on compris autre chose ?
		if (SARAH.context.scribe.lastPartialConfidence >= 0.7 && SARAH.context.scribe.compteurPartial > SARAH.context.scribe.compteur) {
			decodeScribe(SARAH.context.scribe.lastPartial, callback, data);
		} else {
			SARAH.context.scribe.activePlugin('Aucun (GoogleMeteo)');
			//ScribeSpeak("Désolé je n'ai pas compris. Merci de réessayer.", true);
			return callback({ 'tts': "Désolé je n'ai pas compris. Merci de réessayer." });
		}
	} else {
		// pas traité
	}
}

function decodeScribe(search, callback, data) {

	console.log ("Search: " + search);
	if(data.dateask == 'true') {
		var rgxp = /(météo|temps|temps fait il|température|température fait il) (.+)/i;
	} else {
		var rgxp = /(météo|temps|temps fait il|température|température fait il)/i;
	}

	var match = search.match(rgxp);
	if (!match || match.length <= 1){
		SARAH.context.scribe.activePlugin('Aucun (GoogleMeteo)');
		//ScribeSpeak("Désolé je n'ai pas compris.", true);
		return callback({ 'tts': "Désolé je n'ai pas compris." });
	}
	search = (data.dateask == 'true') ? match[2] : "";

	return meteo(search, callback);
}


function meteo(dateandcity, callback) {
	var search = "quelle est la météo " + dateandcity;
	var url = "https://www.google.fr/search?q=" + encodeURI(search) + "&btnG=Rechercher&gbv=1";
	console.log('Url Request: ' + url);

	var request = require('request');
	var cheerio = require('cheerio');

	var options = {
		'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/49.0.2623.87 Safari/537.36',
		'Accept-Charset': 'utf-8'
	};
	
	request({ 'uri': url, 'headers': options }, function(error, response, html) {

    	if (error || response.statusCode != 200) {
			//ScribeSpeak("L'action a échoué. Erreur " + response.statusCode);
			callback({ 'tts': "L'action a échoué. Erreur " + response.statusCode });
			return;
	    }
        var $ = cheerio.load(html);

        var temperature = $('.g .e span.wob_t').first().text().trim().replace('°C', " degrés");

        var infos = $("#search .g .e tr:nth-child(3) td").text().trim();

        var ville = $('.g .e h3').text().trim().replace('Météo à ', '');

        if(temperature == "" || infos == "" || ville == "") {
        	console.log("Impossible de récupérer les informations météo sur Google");
        	//ScribeSpeak("Désolé, je n'ai pas réussi à récupérer les informations");
        	callback({ 'tts': "Désolé, je n'ai pas réussi à récupérer d'informations" });
        } else {
        	console.log("Température: " + temperature);
        	console.log("Informations: " + infos);
        	console.log("Localisation: " + ville);
        	//ScribeSpeak("La météo " + dateandcity + " est " + infos + " avec une température de " + temperature);
        	callback({ 'tts': "La météo " + dateandcity + " est " + infos + " avec une température de " + temperature });
        }
	    return;
    });
}