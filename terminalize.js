var terminalize = function(elem) {
  var main = $('<div>');
  var log = $('<div>');
  var lastLine = $('<div>');
  var ps1 = $('<span>');
  var inputWrap = $('<div>');
  var input = $('<input>');
  var lis = $(elem).children('li');

  var ps1Str = '<span class="terminal-red">|ID|</span>@<span class="terminal-blue">|HOST|</span>:<span class="terminal-yellow">|PWD|</span>$&nbsp;';
  var pwd = '/';
  var histories = [];
  var historyPointer = 0;
  var lineBuffer;

  var print = function(msg, isHtml) {
    var pre = $('<pre>');
    pre.addClass('terminal-output');
    if (isHtml) {
      pre.html(msg);
    } else {
      pre.text(msg);
    }
    log.append(pre);
  };

  var keyHandler = function(event) {
    switch(event.keyCode) {
      case 0x0d: // Return
        event.preventDefault();
        if (input.val()) {
          histories.push(input.val());
        }
        historyPointer = histories.length;
        doCommand();
        parsePs1();
        break;
      case 0x26: // Up arrow
        if (historyPointer == histories.length) {
          lineBuffer = input.val();
        }
        if (historyPointer > 0) {
          historyPointer -= 1;
          input.val(histories[historyPointer]);
        }
        break;
      case 0x28: // Down arrow
        if (historyPointer >= histories.length) {
          break;
        }

        historyPointer += 1;
        if (historyPointer == histories.length) {
          input.val(lineBuffer);
        } else {
          input.val(histories[historyPointer]);
        }
        break;
    }
  };

  var doCommand = function() {
    var command = input.val();
    var psStr = ps1.html();
    var escapedCommand = $('<span>').text(command).html();
    print(psStr + escapedCommand, true);
    input.val(null);
  };

  var parsePs1 = function() {
    ps1.html(ps1Str
        .replace('|ID|', 'guest')
        .replace('|HOST|', 'localhost')
        .replace('|PWD|', pwd)
        );
  }


  main.addClass('terminal-main');
  log.addClass('terminal-log');
  ps1.addClass('terminal-ps1');
  inputWrap.addClass('terminal-input-wrap');
  input.addClass('terminal-input');


  parsePs1();

  main.append(log);
  main.append(lastLine);

  lastLine.append(ps1);
  lastLine.append(inputWrap);
  inputWrap.append(input);

  input.on('keydown', keyHandler);

  $(elem).replaceWith(main);
  input.focus();
};
