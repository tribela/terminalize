var terminalize = function(elem) {
  var main = $('<div>');
  var log = $('<div>');
  var lastLine = $('<div>');
  var ps1 = $('<span>');
  var inputWrap = $('<div>');
  var input = $('<input>');
  var lis = $(elem).children('li');

  var print = function(msg) {
    var pre = $('<pre>');
    pre.addClass('terminal-output');
    pre.text(msg);
    log.append(pre);
  };


  main.addClass('terminal-main');
  log.addClass('terminal-log');
  ps1.addClass('terminal-ps1');
  inputWrap.addClass('terminal-input-wrap');
  input.addClass('terminal-input');


  main.append(log);
  main.append(lastLine);

  lastLine.append(ps1);
  lastLine.append(inputWrap);
  inputWrap.append(input);

  $(elem).after(main);
  $(elem).remove();
  input.focus();
};
