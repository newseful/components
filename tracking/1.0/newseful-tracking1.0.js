// Add support for parsing functions on strings
NodeList.prototype.map = NodeList.prototype.map || Array.prototype.map;

String.prototype.strip = function() {
	return this.replace('[[', '').replace(']]','')
};

String.prototype.prevIndexOf = function(query, index) {
	var sub = this.substr(0, index);
	return sub.lastIndexOf(query);
};

String.prototype.nextIndexOf = function(query, index) {
	var sub = this.substr(index);
	return sub.indexOf(query) + index;
};

String.prototype.splitAtIndex = function(index) {
	return this.split(this.charAt(index));
}

DOMTokenList.prototype.addMany = function() {
	for (var key in arguments) {
		var arg = arguments[key];
		this.add(arg);
	}
}

String.prototype.cutExpression = function(open, close) {
	var o = this.indexOf(open);
	var c = this.indexOf(close) + close.length;
	var prev = this.substr(0,o);
	var post = this.substr(c);
	var amended = prev + post;
	return amended.replace(' .', '.');
};

String.prototype.stripLeadingSpaces = function() {
	var str = this.substr(0);
	while(str.charAt(0) == ' ') {
		str = str.substr(1);
	};

	return str;
};

var NFFactCheck = function(opts) {
	this.openingExpression = '[[';
	this.closingExpression = ']]';
	this.facts = [];
	this.sortedFacts = {};
	this.reservedKeywords = ['confirmed', 'unconfirmed', 'false'];

	this.el = opts.textElement;
	this.listEl = opts.listElement || this.el;

	this.inline(opts.textElement);

	if (opts.showList) {
		this.renderFactsModule(this.listEl);
	}
};

NFFactCheck.prototype.sortData = function(data) {
var _ = this;
	this.reservedKeywords.forEach(function(key) {
		_.sortedFacts[key] = _.facts.filter(function(fact) {
			return fact.type == key;
		});
	});
};

NFFactCheck.prototype.textNodesInSelection = function(el) {
  var n, a=[], walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
  while(n=walk.nextNode()) a.push(n);
  return a;
};

NFFactCheck.prototype.tree = tree = function(node) {
	var text = node.innerHTML,
			tree = node.cloneNode(false),
			_ = this;

	if (text == undefined)
		return node;

	var openExpr = text.indexOf(this.openingExpression),
			closeExpr = text.indexOf(this.closingExpression) + this.closingExpression.length,
			length = closeExpr - openExpr;

	while (openExpr > -1 && closeExpr > -1) {

		var expr = text.substr(openExpr, length),
				type = (function() {
					var match = _.reservedKeywords.filter(function(k) {
						return k == expr.strip();
					});

					if (match.length == 0)
						return 'unconfirmed';

					return match[0];
				})();
		
		var sentenceStart = text.prevIndexOf('.', openExpr),
				sentenceEnd = text.nextIndexOf('.', closeExpr);

		var prev = text.substr(0,text.prevIndexOf('.', sentenceStart)),
				post = text.substr(sentenceEnd + 1);

		var sentence = text.substr(sentenceStart + 1, sentenceEnd - sentenceStart);
		var cleanSentenceNode = document.createTextNode(sentence.cutExpression(this.openingExpression, this.closingExpression));
		var cleanSentenceWrapper = document.createElement('span');
		cleanSentenceWrapper.classList.add('newseful-fact-inline__wrapper');
		cleanSentenceWrapper.appendChild(cleanSentenceNode);

		var cleanPrevNode = document.createTextNode(prev);

		var output = document.createElement('span');
		output.classList.addMany('newseful-module', 'newseful-fact-inline', 'newseful-fact-inline--' + type);
		output.appendChild(cleanSentenceWrapper);

		this.facts.push({type : type, label : expr.strip(), text : sentence.cutExpression(this.openingExpression, this.closingExpression).stripLeadingSpaces()});

		tree.appendChild(cleanPrevNode);
		tree.appendChild(output);

		text = post;

		// Reset for loop
		openExpr = text.indexOf(this.openingExpression);
		closeExpr = text.indexOf(this.closingExpression) + this.closingExpression.length;
		length = closeExpr - openExpr;
	};

	tree.appendChild(document.createTextNode(text));

	return tree;
}

NFFactCheck.prototype.extract = function(node) {		
	var tree = this.tree(node);
	this.sortData();
	node.parentElement.replaceChild(tree, node);
};

NFFactCheck.prototype.parse = function(el) {
	var nodes = this.textNodesInSelection(el);
	nodes = nodes.map(function(n) { return n.parentElement }).filter(function(n) { return n !== el });
	nodes.map(this.extract, this);
};

NFFactCheck.prototype.inline = function(el) {
	this.parse(el);
};

NFFactCheck.prototype.renderFactsModule = function(el) {
	var container = document.createElement('div');
	container.classList.add('newseful-module');
	container.classList.add('newseful-fact-module');

	var list = document.createElement('ul');
	list.classList.add('newseful-fact-module__fact-list');

	for (var key in this.sortedFacts) {
		this.sortedFacts[key].reduce(function(list, fact) {
			var item = document.createElement('li');
			item.classList.add('newseful-fact-module__list-item')
			item.innerHTML = fact.text;
			item.dataset.status = 'newseful-fact-status--' + fact.type;
			item.dataset.label = fact.label;

			list.appendChild(item);
			return list;
		}, list);
	}

	container.appendChild(list);

	el.insertBefore(container, el.childNodes[0]);
};