define(function(require, exports, module) {
  var colors = {
    '00':'white',
    '01':'black',
    '02':'navy',
    '03':'green',
    '04':'red',
    '05':'brown',
    '06':'purple',
    '07':'olive',
    '08':'yellow',
    '09':'lightgreen',
    '10':'teal',
    '11':'cyan',
    '12':'blue',
    '13':'pink',
    '14':'gray',
    '15':'lightgray'
  };

  var specials = {
    '\x03': 'colors',
    '\x00': 'normal',
    '\x1F': 'underline',
    '\x02': 'bold',
    '\x16': 'italic'
  };

  var cssStyles = {
    'colors':function(bgColor,fontColor) {
      var r = [];
      if ( bgColor ) {
        r.push('background-color:',colors[bgColor],';')
      }

      if ( fontColor ) {
        r.push('color:',colors[fontColor],';')
      }
      return r.join('');
    },
    'underline':'text-decoration:underline;',
    'bold':'font-weight: bold;',
    'italic':'font-style: italic;'
  };

  var lastCharactor = -1, currentCharactor;
  
  function validColorString(curr, ch) {
    var will = curr.join('')+ch;

    if (will.indexOf(",") == -1) {
      will = will +",";
    } 

    if ( !/^[0-9]{0,2},[0-9]{0,2}$/.test(will) ) return false;

    var will_arr = will.split(",");
    if ( parseInt(will_arr[0]) > 15 || parseInt(will_arr[1]) > 15) return false;

    return true;
  }

  function isSameStates(state1, state2) {
    return state1.colors.bgColor == state2.colors.bgColor
          && state1.colors.fontColor == state2.colors.fontColor
          && state1.underline == state2.underline
          && state1.bold == state2.bold
          && state1.italic == state2.italic;
  }

  function resetStates() {
    return {
      colors: {
        bgColor: null,
        fontColor: null,
        parsing: null
      },
      underline: false,
      bold: false,
      italic: false
    }
  }

  window.ircStringToHTML = exports.ircStringToHTML = function (str) {
    var r = [];
    var lastStates = null;
    
    var states = resetStates();
    for ( var idx in str ) {
      var ch = str[idx];
      
      if (ch in specials) {
        switch (ch) {
          case '\x03':
            states.colors.parsing = [];
            break;
          case '\x00':
            states = resetStates();
            break;
          case '\x1F':
            states.underline = !states.underline;
            break;
          case '\x02':
            states.bold = !states.bold;
            break;
          case '\x16':
            states.italic = !states.italic;
            break;
        }
        continue;  
      }

      if ( states.colors.parsing ) {
        if ( validColorString(states.colors.parsing,ch) ) {
          states.colors.parsing.push(ch);
          continue;
        } else {
          if ( states.colors.parsing.indexOf(',') == -1 ) {
            states.colors.parsing.push(',');
          }

          var colors_parsed = states.colors.parsing.join('').split(',');

          if ( !colors_parsed[0] && !colors_parsed[1]) {
            states.colors.fontColor = null;
            states.colors.bgColor = null;
          } else {
            if ( colors_parsed[0] ) {
              var c_str = colors_parsed[0];
              if ( c_str.length == 1 )
                c_str = "0" + c_str;
              states.colors.fontColor = c_str;
            }
            
            if ( colors_parsed[1] ) {
              var c_str = colors_parsed[1];
              if ( c_str.length == 1 )
                c_str = "0" + c_str;
              states.colors.bgColor = c_str;
            }            
          }
          states.colors.parsing = null;
        }
      }

      if (!lastStates || !isSameStates(lastStates,states)) {
        if (lastStates) r.push("</span>");
        if ( states.colors.bgColor || states.colors.fontColor || states.underline || states.bold || states.italic) {
          r.push("<span style='")
          r.push(cssStyles.colors(states.colors.bgColor,states.colors.fontColor))
          if ( states.underline ) r.push(cssStyles.underline);
          if ( states.bold ) r.push(cssStyles.bold);
          if ( states.italic ) r.push(cssStyles.italic);
          r.push("'>")
        }
        lastStates = JSON.parse(JSON.stringify(states)); //copy
      }
      r.push(ch);
    }
    
    return r.join('');
  };
});