var Terminal = function(elem, options) {
  this.main = $('<div>');
  this.log = $('<div>');
  this.ps1 = $('<span>');
  this.input = $('<input>');

  var lastLine = $('<div>');
  var inputWrap = $('<div>');

  this.ps1Str = '<span class="terminal-red">guest</span>@<span class="terminal-blue">localhost</span>:<span class="terminal-yellow">|PWD|</span>$&nbsp;';
  this.root = new Directory();
  this.dir = this.root;
  this.histories = [];
  this.historyPointer = 0;
  this.lineBuffer;

  this.commands = {
    help: $.proxy(this.commandHelp, this),
    ls: $.proxy(this.commandLs, this),
    cd: $.proxy(this.commandCd, this),
    cat: $.proxy(this.commandCat, this),
  };

  parseList(elem, this.root);

  if (options) {
    if ('issue' in options) {
      this.print(options.issue);
    }

    if ('ps1' in options) {
      this.ps1Str = options.ps1;
    }
  }


  this.main.addClass('terminal-main');
  this.log.addClass('terminal-log');
  this.ps1.addClass('terminal-ps1');
  inputWrap.addClass('terminal-input-wrap');
  this.input.addClass('terminal-input');


  this.parsePs1();

  this.main.append(this.log);
  this.main.append(lastLine);

  lastLine.append(this.ps1);
  lastLine.append(inputWrap);
  inputWrap.append(this.input);

  this.input.on('keydown', $.proxy(this.keyHandler, this));
  this.main.on('click', $.proxy(function() { this.input.focus(); }, this));

  $(elem).replaceWith(this.main);
  this.input.focus();
}

Terminal.prototype.print = function(msg, isHtml) {
  var pre = $('<pre>');
  pre.addClass('terminal-output');
  if (isHtml) {
    pre.html(msg);
  } else {
    pre.text(msg);
  }
  this.log.append(pre);
};

Terminal.prototype.keyHandler = function(event) {
  switch(event.keyCode) {
    case 0x0d: // Return
      event.preventDefault();
      var line = this.input.val();
      if (line) {
        this.histories.push(line);
      }
      this.historyPointer = this.histories.length;
      this.doCommand();
      this.parsePs1();
      this.main.scrollTop(this.main.outerHeight());
      break;
    case 0x26: // Up arrow
      if (this.historyPointer == this.histories.length) {
        this.lineBuffer = this.input.val();
      }
      if (this.historyPointer > 0) {
        this.historyPointer -= 1;
        this.input.val(this.histories[this.historyPointer]);
      }
      break;
    case 0x28: // Down arrow
      if (this.historyPointer >= this.histories.length) {
        break;
      }

      this.historyPointer += 1;
      if (this.historyPointer == this.histories.length) {
        this.input.val(this.lineBuffer);
      } else {
        this.input.val(this.histories[this.historyPointer]);
      }
      break;
    case 0x09: // Tab
      event.preventDefault();
      var args = this.parseLine(this.input.val());
      var paths = args[args.length-1].split('/');
      var uncompleted = paths.pop();
      var baseDir = paths.join('/');
      var candidates = this.dir.getDir(baseDir).list();
      var matched = candidates.filter(function(val) {
        return val.name.indexOf(uncompleted) == 0;
      });
      if (matched.length == 1) {
        var appendStr = matched[0].name.slice(uncompleted.length);
        this.input.val(this.input.val() + appendStr);
      }
      break;
  }
};

Terminal.prototype.doCommand = function() {
  var line = this.input.val();
  var psStr = this.ps1.html();
  var escapedLine = $('<span>').text(line).html();
  this.print(psStr + escapedLine, true);

  var args = this.parseLine(line);
  if (args.length) {
    var command = args.shift();
    if (command in this.commands) {
      this.commands[command](args);
    } else {
      this.print('command not found: ' + command);
    }
  }

  this.input.val(null);
};

Terminal.prototype.parseLine = function(command){
  var states = {
    normal: 'normal',
    whitespace: 'whitespace',
    backslash: 'backslash',
    quote: 'quote',
    singlequote: 'singlequote'
  };
  var state = states.normal;
  var prevstate = state; // for backslash mode

  var args = [];
  var buffer = "";
  for(var i=0; i<command.length; i++){
    var input = command[i];
    switch(state){
      case states.normal:
        switch(input){
          case '\\':
            prevstate = state;
            state = states.backslash;
            break;
          case '\"':
            state = states.quote;
            break;
          case '\'':
            state = states.singlequote;
            break;
          case ' ':
            state = states.whitespace;
            args.push(buffer);
            buffer = "";
            break;
          default:
            buffer += input;
        }
        break;
      case states.whitespace:
        switch(input){
          case ' ':
            break;
          case '\\':
            //new character. same as default
            prevstate = states.normal;
            state = states.backslash;
            break;
          case '\"':
            state = states.quote;
            break;
          case '\'':
            state = states.singlequote;
            break;
          default:
            buffer += input;
            state = states.normal;
        }
        break;
      case states.backslash:
        buffer += input;
        state = prevstate;
        break;
      case states.quote:
        switch(input){
          case '\"':
            state = states.normal;
            break;
          case '\\':
            prevstate = state;
            state = states.backslash;
            break;
          default:
            buffer += input;
        }
        break;
      case states.singlequote:
        switch(input){
          case '\'':
            state = states.normal;
            break;
          case '\\':
            prevstate = state;
            state = states.backslash;
            break;
          default:
            buffer += input;
        }
        break;
    }
  }
  if(state == states.normal || state == states.whitespace){
    if(buffer.length > 0){
      args.push(buffer);
    }
    return args
  }else{
    this.print("Command line parse error");
  }
};

Terminal.prototype.parsePs1 = function() {
  this.ps1.html(this.ps1Str
      .replace('|PWD|', this.dir.getPath())
      );
};

var parseList = function(elem, dir) {
  var lis = $(elem).children('li');
  lis.each(function() {
    var name = $(this).children('h1').text();
    var uls = $(this).children('ul');
    var anchor = $(this).children('a');
    var content = $(this).contents().filter(function() {
      return this.nodeType == 3;
    }).text().trim();
    var current;

    if (uls.length) {
      current = new Directory(name);
      dir.append(current);
      uls.each(function() {
        parseList(this, current);
      });
    } else if (anchor.length) {
      current = new SpecialDirectory(anchor.text(), anchor.attr('href'));
      dir.append(current);
    } else {
      current = new File(name, content);
      dir.append(current);
    }
  });
};

Terminal.prototype.commandHelp = function() {
  for (command in this.commands) {
    this.print(command);
  }
};

Terminal.prototype.commandLs = function(args) {
  var showHidden = false;
  var verbose = false;
  var destination = this.dir.getPath();
  var results;
  var output;

  for(var i=0; i<args.length; i++){
    if(args[i][0] == '-'){
      if(args[i].indexOf('a') > -1){
        showHidden = true;
      }
      if(args[i].indexOf('l') > -1){
        verbose = true;
      }
    }else{
      destination = args[i];
    }
  }

  var obj = this.dir.getDir(destination);
  if (obj == null) {
    this.print('File or directory not found.');
    return;
  }

  if (obj.type == 'directory') {
    results = obj.list(showHidden);
  } else {
    results = [obj];
  }

  output = results.map(function(obj) {
    var format;
    var name;
    var desc;
    switch(obj.type) {
      case 'directory':
        format = 'dr-xr-xr-x';
        name = '<span class="terminal-blue">' + obj.name + '</span>';
        break;
      case 'specialdirectory':
        format = 'sr-xr-xr-x';
        name = '<span class="terminal-yellow">' + obj.name + '</span>';
        desc = '-> ' + obj.dest;
        break;
      default:
        format = '-r-xr-xr-x';
        name = obj.name;
    }
    if (verbose) {
      return [format, name, desc].join(' ');
    }
    return name;
  });

  this.print(output.join(verbose?'\n':' '), true);
};

Terminal.prototype.commandCd = function(args) {
  if ( ! args.length) {
    return;
  }

  var path = args[0];
  var dst = this.dir.getDir(path);

  if ( ! dst) {
    this.print('File or directory not found.');
    return;
  }

  switch(dst.type) {
    case 'directory':
      this.dir = dst;
      break;
    case 'specialdirectory':
      location.href = dst.dest;
      break;
    default:
      this.print(dst.name + ' is not a directory.');
  }
}

Terminal.prototype.commandCat = function(args) {
  if ( ! args.length) {
    return;
  }

  var path = args[0];
  var dst = this.dir.getDir(path);

  if ( ! dst) {
    this.print('File or Directory not found');
  } else if (dst.type != 'file') {
    this.print(dst.name + ' is not a file.');
  } else {
    this.print(dst.content);
  }
}


function Directory(name) {
  this.type = 'directory';
  this.name = name;
  this.upper = null;
  this.children = [];
};

Directory.prototype.append = function(obj) {
  this.children.push(obj);
  obj.upper = this;
};

Directory.prototype.list = function(showHidden) {
  return this.children.filter(function(obj) {
    if (obj.name[0] == '.' && ! showHidden) {
      return false;
    }
    return true;
  });
};

Directory.prototype.getChild = function(name) {
  var filtered = this.children.filter(function(obj) {
    return (obj.name == name)?true:false;
  });
  if (filtered.length) {
    return filtered[0];
  }
}

Directory.prototype.getPath = function() {
  if (this.upper == null) {
    return '/';
  }
  var arr = [];
  var dir = this;
  while (dir) {
    arr.unshift(dir.name);
    dir = dir.upper;
  }
  return arr.join('/');
}

Directory.prototype.getDir = function(dir){
  var curdir = this;
  var root = curdir;

  while (root.upper) {
    root = root.upper;
  }

  if(dir == "/"){
    return root;
  }else if(dir == ""){
    return this;
  }else if(dir[0] == '/'){
    curdir = root;
    dir = dir.slice(1);
  }else{
    curdir = this;
  }

  //remove last slash
  if(dir[dir.length-1] == '/'){
    dir = dir.slice(0, dir.length-1);
  }
  var dirs = dir.split('/');
  for(var i=0; i<dirs.length; i++){
    dirname = dirs[i];
    if(dirname == ".."){
      curdir = curdir.upper;
    }else if(dirname == "."){
      curdir = curdir;
    }else{
      curdir = curdir.getChild(dirname);
    }

    if(curdir == null){
      return null;
    }else if(i < dirs.length-1 && curdir.type != 'directory'){
      return null;
    }
  }
  return curdir;
}

Directory.prototype.getSize = function() {
  return 4092;
}

function SpecialDirectory(name, dest){
  this.type='specialdirectory';
  this.name = name;
  this.upper = null;
  this.dest = dest;
}

SpecialDirectory.prototype.getSize = function(){
  return 4092;
}

function File(name, content){
  this.type = 'file';
  this.name = name;
  this.upper = null;
  this.content = content;
}

File.prototype.getSize = function(){
  return this.content.length;
}
