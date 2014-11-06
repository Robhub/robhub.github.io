/*
<Fauve> Robipo: Idée d’amélioration : pourquoi, si possible, ne pas faire figurer dans les textes du corpus
chaque occurence d’une lettre dans une couleure différente, en fonction de la fréquence de celle-ci dans le texte ?


*/

if (!window.console) console = {log: function() {}};// Fix IE

google.load("visualization", "1", {packages:["corechart"]});
var SELECTEDLAYOUT = null;
var BIGRAMS = new Array();
var TRIGRAMS = new Array();
var SPECIAL = new Object(); //Tableau associatif de caractères spéciaux
var SELECTED = null;
var KEYBOARD_HEIGHT = 0;
var FINGERS = [
{'name':'LeftPinky','SC':'1e'},
{'name':'LeftRing','SC':'1f'},
{'name':'LeftMiddle','SC':'20'},
{'name':'LeftIndex','SC':'21'},
{'name':'LeftThumb','SC':'5c'},
{'name':'RightThumb','SC':'39'},
{'name':'RightIndex','SC':'24'},
{'name':'RightMiddle','SC':'25'},
{'name':'RightRing','SC':'26'},
{'name':'RightPinky','SC':'27'}];
var KEY_WIDTH = 0;
var KEY_HEIGHT = 0;
var KEY_OWIDTH = 0;
var KEY_OHEIGHT = 0;
var SC_TO_KEYS = new Object();
var LETTER_TO_KEYS = new Object();
var KEYS = new Array();

var ALLSTATS = new Object();
var KEYBOARD = '';
var LAYOUT = '';
var CORPUS = '';
var KL = false;
var LL = false;
var CL = false;

updateKeyboardName = function(name)
{
	$('#keyboard').text('Clavier : '+name);
}
updateLayoutName = function(name)
{
	$('#layout').text('Disposition : '+name);
}
arrondi = function(nb,deci)
{
	var mult = 1;
	if (deci) mult = Math.pow(10,deci);
	return Math.round(nb*mult)/mult;
}

colorByFinger = function()
{
	var benchmark = new Date();
	for (var k = 0; k < KEYS.length; k++)
	{
		KEYS[k].key.css('background-color','');
		if (KEYS[k]['finger']) KEYS[k]['key'].addClass(FINGERS[KEYS[k]['finger']]['name']);
	}
	
	var diff = (new Date()).getTime() - benchmark.getTime();
	console.log('colorByFinger() : '+diff+'ms');
}
associateFingerToKeys = function()
{
	var benchmark = new Date();
	for (var k = 0; k < KEYS.length; k++)
	{
		var distmin = 9999999999;
		var fmin = -1;
		var xdist = 0;
		var ydist = 0;
		for (var f in FINGERS)
		{
			if (!FINGERS[f]['key']) continue;
			var fk = FINGERS[f]['key'];
			var dist = (KEYS[k].x-KEYS[fk].x)*(KEYS[k].x-KEYS[fk].x)+(KEYS[k].y-KEYS[fk].y)*(KEYS[k].y-KEYS[fk].y);

			dist = Math.sqrt(dist);
			if (FINGERS[f]['name'].indexOf('Thumb') != -1) dist *= 3;// Hack honteux pour le pouce.
			if (dist <= distmin)
			{
				distmin = dist
				fmin = f;
				xdist = KEYS[k].x-KEYS[fk].x;
				ydist = KEYS[k].y-KEYS[fk].y;
			}
		}
		if (fmin != -1)
		{
			KEYS[k]['finger'] = fmin;
			KEYS[k]['fingerdist'] = distmin;
			KEYS[k]['xdist'] = xdist;
			KEYS[k]['ydist'] = ydist;
			//console.log('ydist : '+ydist);
		}
	}
	var diff = (new Date()).getTime() - benchmark.getTime();
	console.log('associateFingerToKeys() : '+diff+'ms');
}


$(document).ready(function()
{
	$.ajaxSetup({ cache: false });
	$('#edits').tabs();
	KEY_WIDTH = $('#key').width();
	KEY_HEIGHT = $('#key').width();
	KEY_OWIDTH = $('#key').outerWidth(true);
	KEY_OHEIGHT = $('#key').outerHeight(true);
	selectKeyboard(checkAllLoaded);
	$.get('special.tsv', function(data)
	{
		SPECIAL = new Object();
		$(data.split('\n')).each(function()
		{
			var values = this.split('\t');
			if (values.length == 2) SPECIAL[values[0]] = values[1];
		});
		selectLayout(checkAllLoaded);
	});
	selectCorpus(checkAllLoaded);
	//$('#updateStats').click(updateStats);
	$('#kb').keyup(updateKeyboard);
	$('#kbl').keyup(updateLayout);
	$('#corpus').keyup(updateCorpus);
	$('#skb').change(selectKeyboard);
	$('#skbl').change(selectLayout);
	$('#scorpus').change(selectCorpus);
	var delai = 500;
	$('#kbl').show();
	$('#calcstats').click(function(){updateStats();});
	$('#clearstats').click(function()
	{
		ALLSTATS=new Object();
		$('#charts').tabs('destroy');
		$('#charts').html('');
	});
	$('#colorfingers').click(colorByFinger);
	$('#colorfreq').click(colorByNb);
	$('#roul').click(function()
	{
		var letters = $('#roultxt').val();
		var roultxt2 = $('#roultxt2').val();
		var combinaisons = new Array();
		for (var l = 0; l < Math.pow(letters.length,letters.length); l++)
		{
			var c = (l).toString(letters.length);
			c = new Array((letters.length - c.length + 1)).join('0') + c;
			var ok = true;
			var res = new Array();
			
			var roulint = 0;
			var roulext = 0;
			var samefinger = 0;
			for (var i in c)
			{
				if (c.indexOf(c[i]) != i) { ok = false; break; }
				res.push(letters[c[i]]);
			}
			if (res.length > 4)
			{
				if (BIGRAMS[''+res[3]+''+res[4]]) samefinger += BIGRAMS[''+res[4]+''+res[3]];
			}
			for (var i in res)
			{
				if (BIGRAMS[''+res[i]+''+roultxt2[i]]) samefinger += BIGRAMS[''+res[i]+''+roultxt2[i]];
				if (BIGRAMS[roultxt2[i]+''+res[i]+'']) samefinger += BIGRAMS[roultxt2[i]+''+res[i]+''];
				for (var j in res)
				{
					if (i == j) continue;
					
					var roul = BIGRAMS[''+res[i]+''+res[j]]*1;
					if (roul)
					{
						if (i < j) roulint += roul;
						else roulext += roul;
					}
				}
			}
			if (ok) combinaisons.push({k:res,v:roulint,sf:samefinger,toString:function(){return this.k+'='+this.v+','+this.sf}});
		}
		combinaisons.sort(function(a,b)
		{
			if (a.sf != 0) return a.sf > b.sf;
			else return a.v < b.v;
		});
		alert(combinaisons.join('\n'));
	
	});
	
	
	/*
	$('#ekb').click(function(){$('#kb').toggle(delai);});
	$('#ekbl').click(function(){$('#kbl').toggle(delai);});
	$('#ecorpus').click(function(){$('#corpus').toggle(delai);});
	*/
});
checkAllLoaded = function()
{
	console.log('checkallloaded');
	if (KL && LL && CL) updateKeyboard();
}
selectKeyboard = function(e)//undefined
{
	KL = false;
	$.get('kb/'+$('#skb').val()+'.tsv', function(data)
	{
		$('#kb').val(data);
		KL = true;
		if (e)
		{
			if (e instanceof Function) e();
			else updateKeyboard();
		}
	});
}
selectLayout = function(e)
{
	LL = false;
	$.get('kbl/'+$('#skbl').val()+'.tsv', function(data)
	{
		$('#kbl').val(data);
		LL = true;
		if (e)
		{
			if (e instanceof Function) e();
			else updateLayout();
		}
	});
}
selectCorpus = function(e)
{
	CL = false;
	$.get('corpus/'+$('#scorpus').val()+'.txt', function(data)
	{
		CORPUS = ($('#scorpus').val().split('.'))[0];
		$('#corpus').val(data);
		CL = true;
		if (e)
		{
			if (e instanceof Function) e();
			else updateCorpus();
		}
	});
}

$(document).keyup(function(event)
{

	console.log(event.which + ' ' + event.keyCode);
	console.log(event);
	if (SELECTED)
	{
		if (event.which == 37) SELECTED.css('left',SELECTED.position().left-10);
		if (event.which == 38) SELECTED.css('top',SELECTED.position().top-10);
		if (event.which == 39) SELECTED.css('left',SELECTED.position().left+10);
		if (event.which == 40) SELECTED.css('top',SELECTED.position().top+10);
	}
	event.preventDefault();
	event.stopPropagation();
	event.stopImmediatePropagation();
});

/* ================= KEY =============== */
var PreviousX = 0;
var PreviousY = 0;
var PreviousW = 1;
var PreviousH = 1;
createKey = function(values,finger)
{
	var sc = values[0];
	var keyobj = new Object();
	var newkey = $('#key').clone().removeAttr('id').addClass('SC'+sc);
	//if (!KEYS[scancode]) KEYS[scancode] = new Array();
	
	var x = ''+values[1];
	var y = ''+values[2];
	var w = 1;
	var h = 1;
	if (values.length >= 4) w = values[3]*1;
	if (values.length >= 5) h = values[4]*1;
	
	
	if (x == 'P') x = PreviousX;
	else if (x == 'PN') x = PreviousX*1 + PreviousW;
	else if (x.substr(0,2) == 'P+') x = PreviousX*1 + x.substr(2)*1;
	else if (x.substr(0,2) == 'P-') x = PreviousX*1 - x.substr(2)*1;
	if (y == 'P') y = PreviousY;
	else if (y == 'PN') y = PreviousY*1 + PreviousH;
	else if (y.substr(0,2) == 'P+') y = PreviousY*1 + y.substr(2)*1;
	else if (y.substr(0,2) == 'P-') y = PreviousY*1 - y.substr(2)*1;
	
	PreviousX = x;
	PreviousY = y;
	PreviousW = w;
	PreviousH = h;
	
	x = x*KEY_OWIDTH;
	y = y*KEY_OHEIGHT;
	w = KEY_WIDTH+(w-1)*KEY_OWIDTH;
	h = KEY_HEIGHT+(h-1)*KEY_OHEIGHT;
	
	
	
	keyobj.sc = sc;
	keyobj.x = x + w/2;
	keyobj.y = y + h/2;
	keyobj.key = newkey;
	
	if (SC_TO_KEYS[sc] == null) SC_TO_KEYS[sc] = new Array();
	SC_TO_KEYS[sc].push(KEYS.length);
	
	for (var f in FINGERS)
	{
		if (FINGERS[f]['SC'] == values[0]) FINGERS[f]['key'] = KEYS.length;
	}
	KEYS.push(keyobj);
	
	newkey.css({left:x,top:y,width:w,height:h});
	if (values.length >= 6)
	{
		newkey.css('-webkit-transform','rotate('+values[5]+'deg)');
		newkey.css('-khtml-transform','rotate('+values[5]+'deg)');
		newkey.css('-moz-transform','rotate('+values[5]+'deg)');
		newkey.css('-o-transform','rotate('+values[5]+'deg)');
		newkey.css('transform','rotate('+values[5]+'deg)');
	}
	//console.log('newkeychilder .SC text = '+values[0]);
	newkey.children('.SC').text('0x'+values[0]);
	/*
	newkey.click(function(event)
	{
		if (SELECTED) SELECTED.removeClass('selected');
		SELECTED = newkey;
		SELECTED.addClass('selected');
	});
	*/
	y2 = y + h;
	if (y2 > KEYBOARD_HEIGHT)
	{
		KEYBOARD_HEIGHT = y2;
		$('#res').css('top',y2);
	}

	$('#display').append(newkey);
}

/* ================= KEYBOARD =============== */
updateKeyboard = function()
{
	var benchmark = new Date();
	KEYS = new Array();
	SC_TO_KEYS = new Object();
	for (var f in FINGERS) { delete FINGERS[f].key; }
	
	KEYBOARD_HEIGHT = 0;
	updateKeyboardName('-noname-');
	$('#display').html('');
	var data = $($('#kb').val().split('\n'));
	data.each(function(i)
	{
		var values = this.split('\t');
		if (values.length >= 2)
		{
			if (values[0] == 'Name') updateKeyboardName(values[1]);
			else if (values[0] == 'ShortName') KEYBOARD = values[1];
			else createKey(values,-1);
		}
	});
	associateFingerToKeys();
	var diff = (new Date()).getTime() - benchmark.getTime();
	$('#keyboard').append(' ('+diff+'ms)');
	updateLayout();
}



/* ================= LAYOUT =============== */
updateLayout = function()
{
	var benchmark = new Date();
	updateLayoutName('-noname-');
	LETTER_TO_KEYS = new Object();

	$('.key').children('.SC').show();
	$('.key').children('.Norm').text('');
	$('.key').children('.Sh').text('');
	$('.key').children('.Agr').text('');
	$('.key').children('.AgrSh').text('');
	
	$($('#kbl').val().split('\n')).each(function()
	{
		var values = this.split('\t');
		if (values.length >= 2)
		{
			if (values[0] == 'Name') updateLayoutName(values[1]);
			else if (values[0] == 'ShortName') LAYOUT = values[1];
			else
			{
				
				var sc = values[0];
				
				var akeys = SC_TO_KEYS[sc];
				for (var i = 1; i < values.length; i++)
				{
					if (akeys)
					{
						for (var k = 0; k < akeys.length; k++)
						{
							if (LETTER_TO_KEYS[values[i]] == null) LETTER_TO_KEYS[values[i]] = akeys[k];
							else if (KEYS[akeys[k]].dist < KEYS[LETTER_TO_KEYS[values[i]]].dist)
							{
								LETTER_TO_KEYS[values[i]] = akeys[k];
							}
						}
					}
					if (SPECIAL[values[i]]) values[i] = SPECIAL[values[i]];
				}
				/*key.children('.SC').hide();*/
				var keys = $('.SC'+sc);
				keys.children('.SC').hide();
				if ((''+values[2]).toLowerCase() != values[1]) keys.children('.Norm').text(values[1]);
				keys.children('.Sh').text(values[2]);
				keys.children('.Agr').text(values[3]);
				keys.children('.AgrSh').text(values[4]);
			}
		}
	});
	console.log(LETTER_TO_KEYS);
	var diff = (new Date()).getTime() - benchmark.getTime();
	$('#layout').append(' ('+diff+'ms)');
	colorByFinger();
	updateCorpus();
}
updateCorpus = function()
{
	if ($('#autostats').attr('checked') == 'checked') updateStats();
}
/* ================= STATS =============== */
updateStats = function()
{
	var benchmark = new Date();
	$('#stats').text('== Stats ==');
	$('#stats').append('<br/>');
	var corpus = $('#corpus').val();
	var fingers = new Array();
	var samefingerschars = new Array();
	var samefingers = new Array();
	var samefingertrigrams = new Array();
	BIGRAMS = new Array();
	TRIGRAMS = new Array();
	var samefinger = 0;
	
	var oldfinger = -1;
	var olderfinger = -1;
	
	var chr = '';
	var oldchr = '';
	var olderchr = '';

	var hand = '';
	var oldhand = '';
	var olderhand = '';
	
	var notfound = 0;
	var chrs = 0;
	var samechr = 0;

	var samehand = 0; 
	var diffhand = 0;

	var roulint = 0;
	var roulext = 0;
	var impossibles = new Array();
	
	var stats = {};
	stats.distance = {tab:'Distance',title:'Distance (touches/caractère)',data:0,min:0};
	
	stats.samefinger = {tab:'MêmeDoigt',title:'%Digrammes à un doigt',data:0,min:0};
	stats.samehand = {tab:'MêmeMain',title:'%Digrammes à une main',data:0,min:0};
	stats.diffhand = {tab:'MainDiff',title:'%Digrammes à deux mains',data:0,min:0};
	stats.rollin = {tab:'Roul.Int.',title:'%Roulements intérieur (Auriculaire→Index)',data:0,min:0};
	stats.rollout = {tab:'Roul.Ext',title:'%Roulements extérieur (Index→Auriculaire)',data:0,min:0};
	
	stats.rowdistribution = {type:'bar',tab:'Lignes',title:'%Répartition des lignes',data:{},min:0};
	stats.rowdistribution.data = {'-2':0,'-1':0,'0':0,'1':0};
	//for (var k in KEYS) { stats.rowdistribution.data[KEYS[k].ydist] = 0; }
	
	
	stats.fingerdistribution = {tab:'Doigts',title:'%Répartition des doigts',data:{},min:0};
	stats.fingerdistribution.data = {};
	for (var f in FINGERS) { stats.fingerdistribution.data[FINGERS[f].name] = 0; }
	
	stats.fingerdistance = {tab:'DistDoigts',title:'%Distance par doigt',data:{},min:0};
	stats.fingerdistance.data = {};
	for (var f in FINGERS) { stats.fingerdistance.data[FINGERS[f].name] = 0; }
	
	stats.samefingerdistribution = {tab:'1Doigt',title:'%Répartition des digrammes à un doigt',data:{},min:0};
	stats.samefingerdistribution.data = {};
	for (var f in FINGERS) { stats.samefingerdistribution.data[FINGERS[f].name] = 0; }
	
	
	
	
	
	for (var k in KEYS)
	{
		KEYS[k].nb = 0;
	}
	
	
	for (var i = 0; i < corpus.length; i++)
	{
		chr = corpus[i];
		if (chr == ' ') chr = 'Space';
		if (chr == '\n') chr = 'Enter';
		if (chr == '\t') chr = 'Tab';
		
		incrementin(BIGRAMS,''+oldchr+''+chr);
		incrementin(TRIGRAMS,''+olderchr+''+oldchr+''+chr);
			
		var key = LETTER_TO_KEYS[chr];
		
		if (key)
		{
			KEYS[key].nb++;
			var dist = KEYS[key].fingerdist / KEY_OHEIGHT;
			stats.distance.data += dist;
			var finger = KEYS[key].finger;
			if (fingers[finger] == null) fingers[finger] = 0;
			fingers[finger]++;
			
			incrementin(stats.rowdistribution.data,arrondi(KEYS[key].ydist/ KEY_OHEIGHT));
			incrementin(stats.fingerdistribution.data,FINGERS[finger].name);
			incrementin(stats.fingerdistance.data,FINGERS[finger].name,dist);
			
			if (finger < 4) hand = 'L';
			else if (finger == 4) hand = 'TL';
			else if (finger == 5) hand == 'TR';
			else hand = 'R';
				
			chrs++;

			// ========= Analyse des trigrammes
			if (olderchr == oldchr && oldchr == chr)
			{
				
			}
			else if (olderfinger == oldfinger && oldfinger == finger)
			{
				incrementin(samefingertrigrams,''+olderchr+''+oldchr+''+chr);
				//incrementin(stats,'Même doigt (trigramme)');
			}
			
			// ========== Analyse des digrammes
			if (oldchr == chr)//meme touche/lettre
			{
				samechr++;
				//incrementin(stats,'Même touche');
			}
			else if (oldfinger == finger)//meme doigt
			{
				stats.samefinger.data++;
				samefinger++;
				//incrementin(stats,'Même doigt');
				if (samefingers[finger] == null) samefingers[finger] = 0;
				samefingers[finger]++;
				incrementin(stats.samefingerdistribution.data,FINGERS[finger].name);
				incrementin(samefingerschars,oldchr+''+chr);
			}
			else if (oldhand == hand)//meme main
			{
				samehand++;
				stats.samehand.data++;
				//incrementin(stats,'Même main');
				//étudier le roulement : intérieur ou extérieur ?
				if (hand == 'L' && finger > oldfinger || hand == 'R' && finger < oldfinger)
				{
					roulint++;
					stats.rollin.data++;
				}
				else
				{
					stats.rollout.data++;
					roulext++;
				}
			}
			else//main différente
			{
				diffhand++;
				stats.diffhand.data++;
				//incrementin(stats,'Main différente');
			}


		}
		else
		{
			pushifnotin(impossibles,chr);
			notfound++;
			hand = '';
			finger = '';
		}
		olderhand = oldhand;
		oldhand = hand;
		olderfinger = oldfinger;
		oldfinger = finger;
		olderchr = oldchr;
		oldchr = chr;
	}
	for (var k in KEYS)
	{
		KEYS[k].nb = (KEYS[k].nb)/chrs*100;
	}

	objpercent(stats.rowdistribution.data,chrs,2);
	objpercent(stats.fingerdistribution.data,chrs,2);
	objpercent(stats.samefingerdistribution.data,stats.samefinger.data,2);
	objpercent(stats.fingerdistance.data,stats.distance.data,3);

	stats.distance.data = arrondi(stats.distance.data/chrs,3);
	stats.rollin.data = arrondi(stats.rollin.data/stats.samehand.data*100,2);
	stats.rollout.data = arrondi(stats.rollout.data/stats.samehand.data*100,2);
	stats.samefinger.data = arrondi(stats.samefinger.data/chrs*100,2);
	stats.samehand.data = arrondi(stats.samehand.data/chrs*100,2);
	stats.diffhand.data = arrondi(stats.diffhand.data/chrs*100,2);
	

	
	
	var arr = [];
	for (var key in samefingerschars)
	{
		var nb = samefingerschars[key];
		arr.push({k:key,v:nb,toString:function(){return this.k+'→'+this.v;}});
	}
	arr.sort(function(a,b){ return a.v < b.v; });
	$('#stats').append('Top10 Digrammes à un doigt : '+arr.slice(0,10).join(' 	')+'<br/>');
	arr = [];
	for (var key in samefingertrigrams)
	{
		var nb = samefingertrigrams[key];
		arr.push({k:key,v:nb,toString:function(){return this.k+'→'+this.v;}});
	}
	arr.sort(function(a,b){ return a.v < b.v; });
	$('#stats').append('Top10 Trigrammes à un doigt : '+arr.slice(0,10).join(' 	')+'<br/>');
	$('#stats').append('Caractères impossible = '+notfound+' : '+impossibles.join(', ')+'<br/>');
	/*
	$('#stats').append('Répartition des doigts : '+fingers.join(', ')+'<br/>');
	$('#stats').append('Caractères possibles = '+chrs+', dont :<br/>');
	$('#stats').append('– Même touche = '+samechr+' ('+arrondi(samechr/chrs*100,2)+'%)<br/>');
	$('#stats').append('– <span id="samefinger">Même doigt</span> = '+samefinger+' ('+arrondi(samefinger/chrs*100,2)+'% : '+samefingers.join(', ')+')<br/>');
	$('#stats').append('– Même main = '+samehand+' ('+arrondi(samehand/chrs*100,2)+'%), dont : ');
	$('#stats').append('<span id="ext">RoulExt</span> = '+arrondi(roulext/samehand*100,2)+'%');
	$('#stats').append(' ; <span id="int">RoulInt</span> = '+arrondi(roulint/samehand*100,2)+'%<br/>');
	$('#stats').append('– <span id="diffhand">Main différente</span> = '+diffhand+' ('+arrondi(diffhand/chrs*100,2)+'%)<br/>');
	*/
	

	
	ALLSTATS[KEYBOARD+'.'+LAYOUT+'.'+CORPUS] = stats;
	
	/* == Charts Generation == */
	$('#charts').tabs('destroy');
	$('#charts').html('<ul></ul>');
	var i = 0;
	for (var stat in stats)
	{
		i++;
		$('#charts ul').append('<li><a href="#charts-'+i+'">'+stats[stat].tab+'</a></li>');
		$('#charts').append('<div id="charts-'+i+'"></div>');
		legende = new Array(stat);
		for (var as in ALLSTATS) { legende.push(as); }
		var graphdata = new Array(legende);
		if (stats[stat].data instanceof Object)
		{
			for (var prop in stats[stat].data)// si stats[stat] est un objet, sinon ça va buger je sens
			{
				data = new Array(prop);
				for (var as in ALLSTATS) { data.push(ALLSTATS[as][stat].data[prop]); }
				graphdata.push(data);
			}
		}
		else
		{
			data = new Array('');
			for (var as in ALLSTATS) { data.push(ALLSTATS[as][stat].data); }
			graphdata.push(data);
		}
		if (stats[stat].type == 'bar') var chart = new google.visualization.BarChart(document.getElementById('charts-'+i));
		else var chart = new google.visualization.ColumnChart(document.getElementById('charts-'+i));
		var chartopt = {title:stats[stat].title, width:1000,height:500,vAxis:{minValue:stats[stat].min}};
		chart.draw(google.visualization.arrayToDataTable(graphdata),chartopt);
		google.visualization.events.addListener(chart, 'select', chartSelect);

		
		
		
		//chart.draw(google.visualization.arrayToDataTable(graphdata), {title:stat});
	}
	$('#charts').tabs();
	colorByNb();
	var diff = (new Date()).getTime() - benchmark.getTime();
	$('#statstiming').text('Stats : '+diff+'ms');
}
chartSelect = function()
{
	console.log(this);
}
colorByNb = function()
{
	for (var k in KEYS)
	{
		// nb max théorique = 100
		// max réaliste = 15-20% (E et espace)
		// max pour bien voir = 10% (on a pas besoin de voir que E et espace sont loin devant)
		var nb = KEYS[k].nb;
		var max = 9;
		var tranches = 5;
		var tranche = max/tranches;
		var r = 0;
		var g = 0;
		var b = 0;
		/*
		if (nb > tranche*5) r = max;
		else if (nb > tranche*4) { r = max; g = (tranche*5-nb)*tranches; }
		else if (nb > tranche*3) { g = max; r = (nb-tranche*3)*tranches; }
		else if (nb > tranche*2) { g = max; b = (tranche*3-nb)*tranches; }
		else if (nb > tranche*1) { b = max; g = (nb-tranche*1)*tranches; }
		else b = nb*tranches;
		*/
		if (nb < tranche*1) b = nb*tranches;
		else if (nb < tranche*2) { b = max; g = (nb-tranche*1)*tranches; }
		else if (nb < tranche*3) { g = max; b = (tranche*3-nb)*tranches; }
		else if (nb < tranche*4) { g = max; r = (nb-tranche*3)*tranches; }
		else if (nb < tranche*5) { r = max; g = (tranche*5-nb)*tranches; }
		else r = max;
		
		var cmin = 96;
		var cmax = 250;
		r = cmin+Math.round(r/max*(cmax-cmin));
		g = cmin+Math.round(g/max*(cmax-cmin));
		b = cmin+Math.round(b/max*(cmax-cmin));
		KEYS[k].key.css('background-color','rgb('+r+','+g+','+b+')');
		
	}
}
objpercent = function(obj,sum,deci)
{
	for (var k in obj) { obj[k] = arrondi(obj[k] / sum * 100,deci); }
}
pourcentager = function(arr,sum)
{
	for (i = 0; i < arr.length; i++) { if (arr[i]) arr[i] = Math.round(arr[i] / sum * 100)+'%'; }
}
incrementin = function(obj,attr,val)
{
	if (val == undefined) val = 1;
	if (!obj[attr]) obj[attr] = 0;
	obj[attr] += val;
}
pushifnotin = function(arr,elem)
{
	var already = 0;
	for (var i = 0; i < arr.length; i++)
	{
		if (arr[i] == elem)
		{
			already = 1;
			break;
		}
	}
	if (already == 0) arr.push(elem);
}

