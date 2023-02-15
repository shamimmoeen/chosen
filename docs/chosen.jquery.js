(function() {
  var $, AbstractChosen, Chosen, SelectParser;

  SelectParser = class SelectParser {
    constructor(options) {
      this.options_index = 0;
      this.parsed = [];
      this.copy_data_attributes = options.copy_data_attributes || false;
    }

    add_node(child) {
      if (child.nodeName.toUpperCase() === "OPTGROUP") {
        return this.add_group(child);
      } else {
        return this.add_option(child);
      }
    }

    add_group(group) {
      var group_position, j, len, option, ref, results1;
      group_position = this.parsed.length;
      this.parsed.push({
        array_index: group_position,
        group: true,
        label: group.label,
        title: group.title ? group.title : void 0,
        children: 0,
        disabled: group.disabled,
        hidden: group.hidden,
        classes: group.className
      });
      ref = group.childNodes;
      results1 = [];
      for (j = 0, len = ref.length; j < len; j++) {
        option = ref[j];
        results1.push(this.add_option(option, group_position, group.disabled));
      }
      return results1;
    }

    // Add templating feature for wcapf
    // source: https://github.com/harvesthq/chosen/pull/692
    get_template_data(option) {
      var attribute_name, i, j, k, len, ref, template_data, v, word;
      template_data = {};
      ref = option.attributes;
      for (k in ref) {
        v = ref[k];
        if (typeof v.nodeName === "string") {
          attribute_name = v.nodeName.split("-");
          if (attribute_name[0] === "data" && (attribute_name = attribute_name.slice(1))) {
            for (i = j = 0, len = attribute_name.length; j < len; i = ++j) {
              word = attribute_name[i];
              if (i !== 0) {
                attribute_name[i] = word.charAt(0).toUpperCase() + word.slice(1);
              }
            }
            template_data[attribute_name.join("")] = v.nodeValue;
          }
        }
      }
      return template_data;
    }

    add_option(option, group_position, group_disabled) {
      if (option.nodeName.toUpperCase() === "OPTION") {
        if (option.text !== "") {
          if (group_position != null) {
            this.parsed[group_position].children += 1;
          }
          this.parsed.push({
            options_index: this.options_index,
            value: option.value,
            text: option.text,
            html: option.innerHTML.replace(/^\s+|\s+$/g, ''),
            title: option.title ? option.title : void 0,
            selected: option.selected,
            disabled: group_disabled === true ? group_disabled : option.disabled,
            hidden: option.hidden,
            group_array_index: group_position,
            group_label: group_position != null ? this.parsed[group_position].label : null,
            classes: option.className,
            style: option.style.cssText,
            data: this.parse_data_attributes(option),
            // Add templating feature for wcapf
            template_data: this.get_template_data(option)
          });
        } else {
          this.parsed.push({
            options_index: this.options_index,
            empty: true,
            data: this.parse_data_attributes(option)
          });
        }
        return this.options_index += 1;
      }
    }

    parse_data_attributes(option) {
      var attr, attrName, dataAttr, j, len, ref;
      dataAttr = {
        'data-option-array-index': this.parsed.length,
        'data-value': option.value
      };
      if (this.copy_data_attributes && option) {
        ref = option.attributes;
        for (j = 0, len = ref.length; j < len; j++) {
          attr = ref[j];
          attrName = attr.nodeName;
          if (/data-.*/.test(attrName)) {
            dataAttr[attrName] = attr.nodeValue;
          }
        }
      }
      return dataAttr;
    }

  };

  SelectParser.select_to_array = function(select, options) {
    var child, j, len, parser, ref;
    parser = new SelectParser(options);
    ref = select.childNodes;
    for (j = 0, len = ref.length; j < len; j++) {
      child = ref[j];
      parser.add_node(child);
    }
    return parser.parsed;
  };

  AbstractChosen = (function() {
    class AbstractChosen {
      constructor(form_field, options1 = {}) {
        this.label_click_handler = this.label_click_handler.bind(this);
        this.form_field = form_field;
        this.options = options1;
        if (!AbstractChosen.browser_is_supported()) {
          return;
        }
        this.is_multiple = this.form_field.multiple;
        this.can_select_by_group = this.form_field.getAttribute('select-by-group') !== null;
        this.set_default_text();
        this.set_default_values();
        this.setup();
        this.set_up_html();
        this.register_observers();
        // instantiation done, fire ready
        this.on_ready();
      }

      set_default_values() {
        this.click_test_action = (evt) => {
          return this.test_active_click(evt);
        };
        this.activate_action = (evt) => {
          return this.activate_field(evt);
        };
        this.active_field = false;
        this.mouse_on_container = false;
        this.results_showing = false;
        this.result_highlighted = null;
        this.is_rtl = this.options.rtl || /\bchosen-rtl\b/.test(this.form_field.className);
        this.allow_single_deselect = (this.options.allow_single_deselect != null) && (this.form_field.options[0] != null) && this.form_field.options[0].text === "" ? this.options.allow_single_deselect : false;
        this.disable_search_threshold = this.options.disable_search_threshold || 0;
        this.disable_search = this.options.disable_search || false;
        this.enable_split_word_search = this.options.enable_split_word_search != null ? this.options.enable_split_word_search : true;
        this.group_search = this.options.group_search != null ? this.options.group_search : true;
        this.search_in_values = this.options.search_in_values || false;
        this.search_contains = this.options.search_contains || false;
        this.single_backstroke_delete = this.options.single_backstroke_delete != null ? this.options.single_backstroke_delete : true;
        this.max_selected_options = this.options.max_selected_options || 2e308;
        this.inherit_select_classes = this.options.inherit_select_classes || false;
        this.inherit_option_classes = this.options.inherit_option_classes || false;
        this.display_selected_options = this.options.display_selected_options != null ? this.options.display_selected_options : true;
        this.display_disabled_options = this.options.display_disabled_options != null ? this.options.display_disabled_options : true;
        this.parser_config = this.options.parser_config || {};
        this.include_group_label_in_selected = this.options.include_group_label_in_selected || false;
        this.max_shown_results = this.options.max_shown_results || Number.POSITIVE_INFINITY;
        this.case_sensitive_search = this.options.case_sensitive_search || false;
        this.hide_results_on_select = this.options.hide_results_on_select != null ? this.options.hide_results_on_select : true;
        this.create_option = this.options.create_option || false;
        this.persistent_create_option = this.options.persistent_create_option || false;
        return this.skip_no_results = this.options.skip_no_results || false;
      }

      set_default_text() {
        if (this.form_field.getAttribute("data-placeholder")) {
          this.default_text = this.form_field.getAttribute("data-placeholder");
        } else if (this.is_multiple) {
          this.default_text = this.options.placeholder_text_multiple || this.options.placeholder_text || AbstractChosen.default_multiple_text;
        } else {
          this.default_text = this.options.placeholder_text_single || this.options.placeholder_text || AbstractChosen.default_single_text;
        }
        this.default_text = this.escape_html(this.default_text);
        this.results_none_found = this.form_field.getAttribute("data-no_results_text") || this.options.no_results_text || AbstractChosen.default_no_result_text;
        this.create_option_text = this.form_field.getAttribute("data-create_option_text") || this.options.create_option_text || AbstractChosen.default_create_option_text;
        return this.options_none_text = this.form_field.getAttribute("data-options_none_text") || this.options.options_none_text || AbstractChosen.default_options_none_text;
      }

      choice_label(item) {
        if (this.include_group_label_in_selected && (item.group_label != null)) {
          return `<b class='group-name'>${this.escape_html(item.group_label)}</b>${item.html}`;
        } else {
          // Add templating feature for wcapf
          // item.html
          if (this.options.templateSelection) {
            return this.options.templateSelection(item.text, item.template_data);
          } else {
            return item.html;
          }
        }
      }

      mouse_enter() {
        return this.mouse_on_container = true;
      }

      mouse_leave() {
        return this.mouse_on_container = false;
      }

      input_focus(evt) {
        if (this.is_multiple) {
          if (!this.active_field) {
            return setTimeout((() => {
              return this.container_mousedown();
            }), 50);
          }
        } else {
          if (!this.active_field) {
            return this.activate_field();
          }
        }
      }

      input_blur(evt) {
        if (!this.mouse_on_container) {
          this.active_field = false;
          return setTimeout((() => {
            return this.blur_test();
          }), 100);
        }
      }

      label_click_handler(evt) {
        if (this.is_multiple) {
          return this.container_mousedown(evt);
        } else {
          return this.activate_field();
        }
      }

      results_option_build(options) {
        var content, data, data_content, j, len, option_el, ref, shown_results;
        content = '';
        shown_results = 0;
        ref = this.results_data;
        for (j = 0, len = ref.length; j < len; j++) {
          data = ref[j];
          data_content = '';
          if (data.group) {
            data_content = this.result_add_group(data);
          } else {
            data_content = this.result_add_option(data);
          }
          if (data_content !== '') {
            shown_results++;
            content += data_content;
          }
          // this select logic pins on an awkward flag
          // we can make it better
          if (options != null ? options.first : void 0) {
            if (data.selected && this.is_multiple) {
              this.choice_build(data);
            } else if (data.selected && !this.is_multiple) {
              this.single_set_selected_text(this.choice_label(data));
            }
          }
          if (shown_results >= this.max_shown_results) {
            break;
          }
        }
        if (!shown_results) {
          option_el = document.createElement("li");
          option_el.className = "no-results no-options";
          option_el.innerHTML = this.options_none_text;
          content = option_el;
        }
        // end wcapf modification
        return content;
      }

      result_add_option(option) {
        var attrName, classes, option_el;
        if (!option.search_match) {
          return '';
        }
        if (!this.include_option_in_results(option)) {
          return '';
        }
        classes = [];
        if (!option.disabled && !(option.selected && this.is_multiple)) {
          classes.push("active-result");
        }
        if (option.disabled && !(option.selected && this.is_multiple)) {
          classes.push("disabled-result");
        }
        if (option.selected) {
          classes.push("result-selected");
        }
        if (option.group_array_index != null) {
          classes.push("group-option");
        }
        if (option.classes !== "") {
          classes.push(option.classes);
        }
        option_el = document.createElement("li");
        option_el.className = classes.join(" ");
        if (option.style) {
          option_el.style.cssText = option.style;
        }
        for (attrName in option.data) {
          if (option.data.hasOwnProperty(attrName)) {
            option_el.setAttribute(attrName, option.data[attrName]);
          }
        }
        option_el.setAttribute("role", "option");
        // Add templating feature for wcapf
        // option_el.innerHTML = option.highlighted_html or option.html
        option_el.innerHTML = this.options.templateResult ? this.options.templateResult(option.text, option.template_data) : option.html;
        option_el.id = `${this.form_field.id}-chosen-search-result-${option.data['data-option-array-index']}`;
        if (option.title) {
          option_el.title = option.title;
        }
        return this.outerHTML(option_el);
      }

      result_add_group(group) {
        var classes, group_el;
        if (!(group.search_match || group.group_match)) {
          return '';
        }
        if (!(group.active_options > 0)) {
          return '';
        }
        classes = [];
        classes.push("group-result");
        if (group.classes) {
          classes.push(group.classes);
        }
        group_el = document.createElement("li");
        group_el.className = classes.join(" ");
        group_el.innerHTML = group.highlighted_html || this.escape_html(group.label);
        if (group.title) {
          group_el.title = group.title;
        }
        return this.outerHTML(group_el);
      }

      append_option(option) {
        return this.select_append_option(option);
      }

      results_update_field() {
        this.set_default_text();
        if (!this.is_multiple) {
          this.results_reset_cleanup();
        }
        this.result_clear_highlight();
        this.results_build();
        if (this.results_showing) {
          return this.winnow_results();
        }
      }

      reset_single_select_options() {
        var j, len, ref, result, results1;
        ref = this.results_data;
        results1 = [];
        for (j = 0, len = ref.length; j < len; j++) {
          result = ref[j];
          if (result.selected) {
            results1.push(result.selected = false);
          } else {
            results1.push(void 0);
          }
        }
        return results1;
      }

      results_toggle() {
        if (this.results_showing) {
          return this.results_hide();
        } else {
          return this.results_show();
        }
      }

      results_search(evt) {
        if (this.results_showing) {
          this.winnow_results();
        } else {
          this.results_show();
        }
        return this.form_field_jq.trigger("chosen:search", {
          chosen: this
        });
      }

      winnow_results(options) {
        var escaped_query, exact_regex, exact_result, fix, highlight_regex, j, len, match_value, option, prefix, query, ref, regex, results, results_group, search_match, startpos, suffix, text;
        this.no_results_clear();
        results = 0;
        exact_result = false;
        match_value = false;
        query = this.get_search_text();
        escaped_query = query.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
        regex = this.get_search_regex(escaped_query);
        exact_regex = new RegExp(`^${escaped_query}$`);
        highlight_regex = this.get_highlight_regex(escaped_query);
        ref = this.results_data;
        for (j = 0, len = ref.length; j < len; j++) {
          option = ref[j];
          option.search_match = false;
          results_group = null;
          search_match = null;
          option.highlighted_html = '';
          if (this.include_option_in_results(option)) {
            if (option.group) {
              option.group_match = false;
              option.active_options = 0;
            }
            if ((option.group_array_index != null) && this.results_data[option.group_array_index]) {
              results_group = this.results_data[option.group_array_index];
              if (results_group.active_options === 0 && results_group.search_match) {
                results += 1;
              }
              results_group.active_options += 1;
            }
            text = option.group ? option.label : option.text;
            if (!(option.group && !this.group_search)) {
              search_match = this.search_string_match(text, regex);
              option.search_match = search_match != null;
              if (!option.search_match && this.search_in_values) {
                option.search_match = this.search_string_match(option.value, regex);
                match_value = true;
              }
              if (option.search_match && !option.group) {
                results += 1;
              }
              exact_result = exact_result || exact_regex.test(option.html);
              if (option.search_match) {
                if (query.length && !match_value) {
                  startpos = search_match.index;
                  prefix = text.slice(0, startpos);
                  fix = text.slice(startpos, startpos + query.length);
                  suffix = text.slice(startpos + query.length);
                  option.highlighted_html = `${this.escape_html(prefix)}<em>${this.escape_html(fix)}</em>${this.escape_html(suffix)}`;
                }
                if (results_group != null) {
                  results_group.group_match = true;
                }
              } else if ((option.group_array_index != null) && this.results_data[option.group_array_index].search_match) {
                option.search_match = true;
              }
            }
          }
        }
        this.result_clear_highlight();
        if (results < 1 && query.length) {
          this.update_results_content("");
          this.fire_search_updated(query);
          if (!(this.create_option && this.skip_no_results)) {
            this.no_results(query);
          }
        } else {
          this.update_results_content(this.results_option_build());
          this.fire_search_updated(query);
          if (!(options != null ? options.skip_highlight : void 0)) {
            this.winnow_results_set_highlight();
          }
        }
        if (this.create_option && (results < 1 || (!exact_result && this.persistent_create_option)) && query.length) {
          return this.show_create_option(query);
        }
      }

      get_search_regex(escaped_search_string) {
        var regex_flag, regex_string;
        regex_string = this.search_contains ? escaped_search_string : `(^|\\s|\\b)${escaped_search_string}[^\\s]*`;
        if (!(this.enable_split_word_search || this.search_contains)) {
          regex_string = `^${regex_string}`;
        }
        regex_flag = this.case_sensitive_search ? "" : "i";
        return new RegExp(regex_string, regex_flag);
      }

      get_highlight_regex(escaped_search_string) {
        var regex_anchor, regex_flag;
        regex_anchor = this.search_contains ? "" : "\\b";
        regex_flag = this.case_sensitive_search ? "" : "i";
        return new RegExp(regex_anchor + escaped_search_string, regex_flag);
      }

      get_list_special_char() {
        var chars;
        chars = [];
        chars.push({
          val: "ae",
          let: "(ä|æ|ǽ)"
        });
        chars.push({
          val: "oe",
          let: "(ö|œ)"
        });
        chars.push({
          val: "ue",
          let: "(ü)"
        });
        chars.push({
          val: "Ae",
          let: "(Ä)"
        });
        chars.push({
          val: "Ue",
          let: "(Ü)"
        });
        chars.push({
          val: "Oe",
          let: "(Ö)"
        });
        chars.push({
          val: "AE",
          let: "(Æ|Ǽ)"
        });
        chars.push({
          val: "ss",
          let: "(ß)"
        });
        chars.push({
          val: "IJ",
          let: "(Ĳ)"
        });
        chars.push({
          val: "ij",
          let: "(ĳ)"
        });
        chars.push({
          val: "OE",
          let: "(Œ)"
        });
        chars.push({
          val: "A",
          let: "(À|Á|Â|Ã|Ä|Å|Ǻ|Ā|Ă|Ą|Ǎ)"
        });
        chars.push({
          val: "a",
          let: "(à|á|â|ã|å|ǻ|ā|ă|ą|ǎ|ª)"
        });
        chars.push({
          val: "C",
          let: "(Ç|Ć|Ĉ|Ċ|Č)"
        });
        chars.push({
          val: "c",
          let: "(ç|ć|ĉ|ċ|č)"
        });
        chars.push({
          val: "D",
          let: "(Ð|Ď|Đ)"
        });
        chars.push({
          val: "d",
          let: "(ð|ď|đ)"
        });
        chars.push({
          val: "E",
          let: "(È|É|Ê|Ë|Ē|Ĕ|Ė|Ę|Ě)"
        });
        chars.push({
          val: "e",
          let: "(è|é|ê|ë|ē|ĕ|ė|ę|ě)"
        });
        chars.push({
          val: "G",
          let: "(Ĝ|Ğ|Ġ|Ģ)"
        });
        chars.push({
          val: "g",
          let: "(ĝ|ğ|ġ|ģ)"
        });
        chars.push({
          val: "H",
          let: "(Ĥ|Ħ)"
        });
        chars.push({
          val: "h",
          let: "(ĥ|ħ)"
        });
        chars.push({
          val: "I",
          let: "(Ì|Í|Î|Ï|Ĩ|Ī|Ĭ|Ǐ|Į|İ)"
        });
        chars.push({
          val: "i",
          let: "(ì|í|î|ï|ĩ|ī|ĭ|ǐ|į|ı)"
        });
        chars.push({
          val: "J",
          let: "(Ĵ)"
        });
        chars.push({
          val: "j",
          let: "(ĵ)"
        });
        chars.push({
          val: "K",
          let: "(Ķ)"
        });
        chars.push({
          val: "k",
          let: "(ķ)"
        });
        chars.push({
          val: "L",
          let: "(Ĺ|Ļ|Ľ|Ŀ|Ł)"
        });
        chars.push({
          val: "l",
          let: "(ĺ|ļ|ľ|ŀ|ł)"
        });
        chars.push({
          val: "N",
          let: "(Ñ|Ń|Ņ|Ň)"
        });
        chars.push({
          val: "n",
          let: "(ñ|ń|ņ|ň|ŉ)"
        });
        chars.push({
          val: "O",
          let: "(Ò|Ó|Ô|Õ|Ō|Ŏ|Ǒ|Ő|Ơ|Ø|Ǿ)"
        });
        chars.push({
          val: "o",
          let: "(ò|ó|ô|õ|ō|ŏ|ǒ|ő|ơ|ø|ǿ|º)"
        });
        chars.push({
          val: "R",
          let: "(Ŕ|Ŗ|Ř)"
        });
        chars.push({
          val: "r",
          let: "(ŕ|ŗ|ř)"
        });
        chars.push({
          val: "S",
          let: "(Ś|Ŝ|Ş|Š)"
        });
        chars.push({
          val: "s",
          let: "(ś|ŝ|ş|š|ſ)"
        });
        chars.push({
          val: "T",
          let: "(Ţ|Ť|Ŧ)"
        });
        chars.push({
          val: "t",
          let: "(ţ|ť|ŧ)"
        });
        chars.push({
          val: "U",
          let: "(Ù|Ú|Û|Ũ|Ū|Ŭ|Ů|Ű|Ų|Ư|Ǔ|Ǖ|Ǘ|Ǚ|Ǜ)"
        });
        chars.push({
          val: "u",
          let: "(ù|ú|û|ũ|ū|ŭ|ů|ű|ų|ư|ǔ|ǖ|ǘ|ǚ|ǜ)"
        });
        chars.push({
          val: "Y",
          let: "(Ý|Ÿ|Ŷ)"
        });
        chars.push({
          val: "y",
          let: "(ý|ÿ|ŷ)"
        });
        chars.push({
          val: "W",
          let: "(Ŵ)"
        });
        chars.push({
          val: "w",
          let: "(ŵ)"
        });
        chars.push({
          val: "Z",
          let: "(Ź|Ż|Ž)"
        });
        chars.push({
          val: "z",
          let: "(ź|ż|ž)"
        });
        chars.push({
          val: "f",
          let: "(ƒ)"
        });
        return chars;
      }

      escape_special_char(str) {
        var j, len, special, specialChars;
        specialChars = this.get_list_special_char();
        for (j = 0, len = specialChars.length; j < len; j++) {
          special = specialChars[j];
          str.replace(new RegExp(special.let, "g"), special.val);
        }
        return str;
      }

      search_string_match(search_string, regex) {
        var match;
        match = regex.exec(search_string);
        if (!this.case_sensitive_search && (match != null)) {
          match = regex.exec(this.escape_special_char(search_string));
        }
        if (!this.search_contains && (match != null ? match[1] : void 0)) {
          match.index += 1;
        }
        return match;
      }

      choices_count() {
        var j, len, option, ref;
        if (this.selected_option_count != null) {
          return this.selected_option_count;
        }
        this.selected_option_count = 0;
        ref = this.form_field.options;
        for (j = 0, len = ref.length; j < len; j++) {
          option = ref[j];
          if (option.selected) {
            this.selected_option_count += 1;
          }
        }
        return this.selected_option_count;
      }

      choices_click(evt) {
        evt.preventDefault();
        this.activate_field();
        if (!(this.results_showing || this.is_disabled)) {
          return this.results_show();
        }
      }

      mousedown_checker(evt) {
        var mousedown_type, ref, ref1, ref2;
        evt = evt || window.event;
        mousedown_type = null;
        if (!evt.which && evt.button !== void 0) {
          evt.which = (ref = evt.button & 1) != null ? ref : {
            1: (ref1 = evt.button & 2) != null ? ref1 : {
              3: (ref2 = evt.button & 4) != null ? ref2 : {
                2: 0
              }
            }
          };
        }
        switch (evt.which) {
          case 1:
            mousedown_type = 'left';
            break;
          case 2:
            mousedown_type = 'right';
            break;
          case 3:
            mousedown_type = 'middle';
            break;
          default:
            mousedown_type = 'other';
        }
        return mousedown_type;
      }

      keydown_checker(evt) {
        var ref, stroke;
        stroke = (ref = evt.which) != null ? ref : evt.keyCode;
        this.search_field_scale();
        if (stroke !== 8 && this.pending_backstroke) {
          this.clear_backstroke();
        }
        switch (stroke) {
          case 8: // backspace
            this.backstroke_length = this.get_search_field_value().length;
            break;
          case 9: // tab
            if (this.results_showing && !this.is_multiple) {
              this.result_select(evt);
            }
            this.mouse_on_container = false;
            break;
          case 13: // enter
            if (this.results_showing) {
              evt.preventDefault();
            }
            break;
          case 27: // escape
            if (this.results_showing) {
              evt.preventDefault();
            }
            break;
          case 32: // space
            if (this.disable_search) {
              evt.preventDefault();
            }
            break;
          case 38: // up arrow
            evt.preventDefault();
            this.keyup_arrow();
            break;
          case 40: // down arrow
            evt.preventDefault();
            this.keydown_arrow();
            break;
        }
      }

      keyup_checker(evt) {
        var ref, stroke;
        stroke = (ref = evt.which) != null ? ref : evt.keyCode;
        this.search_field_scale();
        switch (stroke) {
          case 8: // backspace
            if (this.is_multiple && this.backstroke_length < 1 && this.choices_count() > 0) {
              this.keydown_backstroke();
            } else if (!this.pending_backstroke) {
              this.result_clear_highlight();
              this.results_search();
            }
            break;
          case 13: // enter
            evt.preventDefault();
            if (this.results_showing) {
              this.result_select(evt);
            }
            break;
          case 27: // escape
            if (this.results_showing) {
              this.results_hide();
            }
            break;
          case 9:
          case 16:
          case 17:
          case 18:
          case 38:
          case 40:
          case 91:
            break;
          default:
            // don't do anything on these keys
            this.results_search();
            break;
        }
      }

      clipboard_event_checker(evt) {
        if (this.is_disabled) {
          return;
        }
        return setTimeout((() => {
          return this.results_search();
        }), 50);
      }

      container_width() {
        if (this.options.width != null) {
          return this.options.width;
        }
        if (this.form_field.offsetWidth > 0) {
          return `${this.form_field.offsetWidth}px`;
        }
        return "auto";
      }

      include_option_in_results(option) {
        if (this.is_multiple && (!this.display_selected_options && option.selected)) {
          return false;
        }
        if (!this.display_disabled_options && option.disabled) {
          return false;
        }
        if (option.empty) {
          return false;
        }
        if (option.hidden) {
          return false;
        }
        if ((option.group_array_index != null) && this.results_data[option.group_array_index].hidden) {
          return false;
        }
        return true;
      }

      search_results_touchstart(evt) {
        this.touch_started = true;
        return this.search_results_mouseover(evt);
      }

      search_results_touchmove(evt) {
        this.touch_started = false;
        return this.search_results_mouseout(evt);
      }

      search_results_touchend(evt) {
        if (this.touch_started) {
          return this.search_results_mouseup(evt);
        }
      }

      outerHTML(element) {
        var tmp;
        if (element.outerHTML) {
          return element.outerHTML;
        }
        tmp = document.createElement("div");
        tmp.appendChild(element);
        return tmp.innerHTML;
      }

      // Add class 'chosen-single-inner' for wcapf templating feature.
      get_single_html() {
        return `<a class="chosen-single chosen-default">
  <span class="chosen-single-inner">${this.default_text}</span>
  <div><b></b></div>
</a>
<div class="chosen-drop">
  <div class="chosen-search">
    <input class="chosen-search-input" type="text" autocomplete="off" role="combobox" aria-expanded="false" aria-haspopup="true" aria-autocomplete="list" autocomplete="off" />
  </div>
  <ul class="chosen-results" role="listbox"></ul>
</div>`;
      }

      get_multi_html() {
        return `<ul class="chosen-choices">
  <li class="search-field">
    <input class="chosen-search-input" type="text" autocomplete="off" role="combobox" placeholder="${this.default_text}" aria-expanded="false" aria-haspopup="true" aria-autocomplete="list" />
  </li>
</ul>
<div class="chosen-drop">
  <ul class="chosen-results" role="listbox"></ul>
</div>`;
      }

      get_no_results_html(terms) {
        return `<li class="no-results">
  ${this.results_none_found} <span>${this.escape_html(terms)}</span>
</li>`;
      }

      get_option_html({value, text}) {
        return `<option value="${value}" selected>${text}</option>`;
      }

      get_create_option_html(terms) {
        return `<li class="create-option active-result" role="option"><a>${this.create_option_text}</a> <span>${this.escape_html(terms)}</span></li>`;
      }

      // class methods and variables ============================================================
      static browser_is_supported() {
        if ("Microsoft Internet Explorer" === window.navigator.appName) {
          return document.documentMode >= 8;
        }
        // Below lines are commented out for wcapf
        // if /iP(od|hone)/i.test(window.navigator.userAgent) or
        //    /IEMobile/i.test(window.navigator.userAgent) or
        //    /Windows Phone/i.test(window.navigator.userAgent) or
        //    /BlackBerry/i.test(window.navigator.userAgent) or
        //    /BB10/i.test(window.navigator.userAgent) or
        //    /Android.*Mobile/i.test(window.navigator.userAgent)
        //   return false
        // End wcapf modification
        return true;
      }

    };

    AbstractChosen.default_multiple_text = "Select Some Options";

    AbstractChosen.default_single_text = "Select an Option";

    AbstractChosen.default_no_result_text = "No results for:";

    AbstractChosen.default_create_option_text = "Add Option:";

    AbstractChosen.default_options_none_text = "No options to choose";

    return AbstractChosen;

  }).call(this);

  $ = jQuery;

  $.fn.extend({
    // Changed from chosen to chosenWCAPF for wcapf
    chosenWCAPF: function(options) {
      if (!AbstractChosen.browser_is_supported()) {
        // Do no harm and return as soon as possible for unsupported browsers, namely IE6 and IE7
        // Continue on if running IE document type but in compatibility mode
        return this;
      }
      return this.each(function(input_field) {
        var $this, chosen;
        $this = $(this);
        chosen = $this.data('chosen');
        if (options === 'destroy') {
          if (chosen instanceof Chosen) {
            chosen.destroy();
          }
          return;
        }
        if (!(chosen instanceof Chosen)) {
          $this.data('chosen', new Chosen(this, options));
        }
      });
    }
  });

  Chosen = class Chosen extends AbstractChosen {
    setup() {
      this.form_field_jq = $(this.form_field);
      return this.current_selectedIndex = this.form_field.selectedIndex;
    }

    set_up_html() {
      var container_classes, container_props;
      container_classes = [
        "chosen-container",
        "wcapf-chosen-container" // Added another class for wcapf
      ];
      container_classes.push("chosen-container-" + (this.is_multiple ? "multi" : "single"));
      if (this.inherit_select_classes && this.form_field.className) {
        container_classes.push(this.form_field.className);
      }
      if (this.is_rtl) {
        container_classes.push("chosen-rtl");
      }
      container_props = {
        'class': container_classes.join(' '),
        'title': this.form_field.title
      };
      if (this.form_field.id.length) {
        container_props.id = this.form_field.id.replace(/[^\w]/g, '_') + "_chosen";
      }
      this.container = $("<div />", container_props);
      // CSP without 'unsafe-inline' doesn't allow setting the style attribute directly
      this.container.width(this.container_width());
      if (this.is_multiple) {
        this.container.html(this.get_multi_html());
      } else {
        this.container.html(this.get_single_html());
      }
      this.form_field_jq.css('position', 'absolute').css('opacity', 0).css('display', 'none').after(this.container);
      this.dropdown = this.container.find('div.chosen-drop').first();
      this.search_field = this.container.find('input').first();
      this.search_results = this.container.find('ul.chosen-results').first();
      this.search_results.attr('id', `${this.form_field.id}-chosen-search-results`);
      this.search_groups = this.container.find('li.group-results').first();
      this.search_field_scale();
      this.search_no_results = this.container.find('li.no-results').first();
      if (this.is_multiple) {
        this.search_choices = this.container.find('ul.chosen-choices').first();
        this.search_container = this.container.find('li.search-field').first();
      } else {
        this.search_container = this.container.find('div.chosen-search').first();
        this.selected_item = this.container.find('.chosen-single').first();
      }
      this.set_aria_labels();
      this.results_build();
      this.set_tab_index();
      return this.set_label_behavior();
    }

    on_ready() {
      return this.form_field_jq.trigger("chosen:ready", {
        chosen: this
      });
    }

    register_observers() {
      this.container.on('touchstart.chosen', (evt) => {
        this.container_mousedown(evt);
      });
      this.container.on('touchend.chosen', (evt) => {
        this.container_mouseup(evt);
      });
      this.container.on('mousedown.chosen', (evt) => {
        this.container_mousedown(evt);
      });
      this.container.on('mouseup.chosen', (evt) => {
        this.container_mouseup(evt);
      });
      this.container.on('mouseenter.chosen', (evt) => {
        this.mouse_enter(evt);
      });
      this.container.on('mouseleave.chosen', (evt) => {
        this.mouse_leave(evt);
      });
      this.search_groups.bind('mouseup.chosen', (evt) => {
        this.search_results_mouseup(evt);
      });
      this.search_groups.bind('mouseover.chosen', (evt) => {
        this.search_results_mouseover(evt);
      });
      this.search_groups.bind('mouseout.chosen', (evt) => {
        this.search_results_mouseout(evt);
      });
      this.search_groups.bind('mousewheel.chosen DOMMouseScroll.chosen', (evt) => {
        this.search_results_mousewheel(evt);
      });
      this.search_results.on('mouseup.chosen', (evt) => {
        this.search_results_mouseup(evt);
      });
      this.search_results.on('mouseover.chosen', (evt) => {
        this.search_results_mouseover(evt);
      });
      this.search_results.on('mouseout.chosen', (evt) => {
        this.search_results_mouseout(evt);
      });
      this.search_results.on('mousewheel.chosen DOMMouseScroll.chosen', (evt) => {
        this.search_results_mousewheel(evt);
      });
      this.search_results.on('touchstart.chosen', (evt) => {
        this.search_results_touchstart(evt);
      });
      this.search_results.on('touchmove.chosen', (evt) => {
        this.search_results_touchmove(evt);
      });
      this.search_results.on('touchend.chosen', (evt) => {
        this.search_results_touchend(evt);
      });
      this.form_field_jq.on("chosen:updated.chosen", (evt) => {
        this.results_update_field(evt);
      });
      this.form_field_jq.on("chosen:activate.chosen", (evt) => {
        this.activate_field(evt);
      });
      this.form_field_jq.on("chosen:open.chosen", (evt) => {
        this.container_mousedown(evt);
      });
      this.form_field_jq.on("chosen:close.chosen", (evt) => {
        this.close_field(evt);
      });
      this.search_field.on('blur.chosen', (evt) => {
        this.input_blur(evt);
      });
      this.search_field.on('keyup.chosen', (evt) => {
        this.keyup_checker(evt);
      });
      this.search_field.on('keydown.chosen', (evt) => {
        this.keydown_checker(evt);
      });
      this.search_field.on('focus.chosen', (evt) => {
        this.input_focus(evt);
      });
      this.search_field.on('cut.chosen', (evt) => {
        this.clipboard_event_checker(evt);
      });
      this.search_field.on('paste.chosen', (evt) => {
        this.clipboard_event_checker(evt);
      });
      if (this.is_multiple) {
        return this.search_choices.on('click.chosen', (evt) => {
          this.choices_click(evt);
        });
      } else {
        return this.container.on('click.chosen', function(evt) {
          evt.preventDefault(); // gobble click of anchor
        });
      }
    }

    destroy() {
      $(this.container[0].getRootNode != null ? this.container[0].getRootNode() : this.container[0].ownerDocument).off('click.chosen', this.click_test_action);
      if (this.form_field_label.length > 0) {
        this.form_field_label.off('click.chosen');
      }
      if (this.search_field[0].tabIndex) {
        this.form_field_jq[0].tabIndex = this.search_field[0].tabIndex;
      }
      this.container.remove();
      this.form_field_jq.removeData('chosen');
      return this.form_field_jq.show();
    }

    set_aria_labels() {
      var i, j, label, labelledbyList, len, ref;
      this.search_field.attr("aria-owns", this.search_results.attr("id"));
      if (this.form_field.attributes["aria-label"]) {
        this.search_field.attr("aria-label", this.form_field.attributes["aria-label"]);
        if (this.form_field.attributes["aria-labelledby"]) {
          return this.search_field.attr("aria-labelledby", this.form_field.attributes["aria-labelledby"]);
        }
      } else if (Object.prototype.hasOwnProperty.call(this.form_field, 'labels') && this.form_field.labels.length) {
        labelledbyList = "";
        ref = this.form_field.labels;
        for (i = j = 0, len = ref.length; j < len; i = ++j) {
          label = ref[i];
          if (label.id === "") {
            label.id = `${this.form_field.id}-chosen-label-${i}`;
          }
          labelledbyList += this.form_field.labels[i].id + " ";
        }
        return this.search_field.attr("aria-labelledby", labelledbyList);
      }
    }

    search_field_disabled() {
      this.is_disabled = this.form_field.disabled || this.form_field_jq.parents('fieldset').is(':disabled');
      this.container.toggleClass('chosen-disabled', this.is_disabled);
      this.search_field[0].disabled = this.is_disabled;
      if (!this.is_multiple) {
        this.selected_item.off('focus.chosen', this.activate_field);
      }
      if (this.is_disabled) {
        return this.close_field();
      } else if (!this.is_multiple) {
        return this.selected_item.on('focus.chosen', this.activate_field);
      }
    }

    container_mousedown(evt) {
      var ref;
      if (!this.is_disabled && (evt && this.mousedown_checker(evt) === 'left')) {
        if (evt && evt.type === "mousedown" && !this.results_showing) {
          evt.preventDefault();
        }
      }
      if (evt && ((ref = evt.type) === 'mousedown' || ref === 'touchstart') && !this.results_showing) {
        if (!($(evt.target)).hasClass("search-choice-close")) { // This line is added for wcapf
          evt.preventDefault();
        }
      }
      if (!((evt != null) && ($(evt.target)).hasClass("search-choice-close"))) {
        if (!this.active_field) {
          if (this.is_multiple) {
            this.search_field.val("");
          }
          $(this.container[0].getRootNode != null ? this.container[0].getRootNode() : this.container[0].ownerDocument).on('click.chosen', this.click_test_action);
          this.results_show();
        } else if (!this.is_multiple && evt && (($(evt.target)[0] === this.selected_item[0]) || $(evt.target).parents("a.chosen-single").length)) {
          evt.preventDefault();
          this.results_toggle();
        }
        return this.activate_field();
      }
    }

    container_mouseup(evt) {
      if (!this.is_disabled && this.allow_single_deselect && $(evt.target).hasClass('search-choice-close')) {
        return this.results_reset(evt);
      }
    }

    search_results_mousewheel(evt) {
      var delta;
      if (evt.originalEvent) {
        delta = evt.originalEvent.deltaY || -evt.originalEvent.wheelDelta || evt.originalEvent.detail;
      }
      if (delta != null) {
        evt.preventDefault();
        if (evt.type === 'DOMMouseScroll') {
          delta = delta * 40;
        }
        return this.search_results.scrollTop(delta + this.search_results.scrollTop());
      }
    }

    blur_test(evt) {
      if (!this.active_field && this.container.hasClass("chosen-container-active")) {
        return this.close_field();
      }
    }

    close_field() {
      $(this.container[0].getRootNode != null ? this.container[0].getRootNode() : this.container[0].ownerDocument).off("click.chosen", this.click_test_action);
      this.active_field = false;
      this.results_hide();
      this.search_field.attr("aria-expanded", false);
      this.container.removeClass("chosen-container-active");
      this.container.removeClass("chosen-dropup");
      this.clear_backstroke();
      this.show_search_field_default();
      this.search_field_scale();
      return this.search_field.trigger("blur");
    }

    should_dropup() {
      var dropdownTop, totalHeight, windowHeight;
      windowHeight = $(window).height();
      dropdownTop = this.container.offset().top + this.container.height() - $(window).scrollTop();
      totalHeight = this.dropdown.height() + dropdownTop;
      if (totalHeight > windowHeight) {
        return true;
      } else {
        return false;
      }
    }

    activate_field() {
      if (this.is_disabled) {
        return;
      }
      this.container.addClass("chosen-container-active");
      if (this.should_dropup()) {
        this.container.addClass("chosen-dropup");
      }
      this.active_field = true;
      this.search_field.val(this.search_field.val());
      this.search_results.attr("aria-busy", false);
      return this.search_field.trigger("focus");
    }

    test_active_click(evt) {
      var active_container;
      active_container = $(evt.target).closest('.chosen-container');
      if (this.mousedown_checker(evt) === 'left' && active_container.length && this.container[0] === active_container[0]) {
        return this.active_field = true;
      } else {
        return this.close_field();
      }
    }

    results_build() {
      this.parsing = true;
      this.selected_option_count = null;
      this.results_data = SelectParser.select_to_array(this.form_field, this.parser_config);
      if (this.is_multiple) {
        this.search_choices.find("li.search-choice").remove();
      } else {
        this.single_set_selected_text();
        if (this.disable_search || this.form_field.options.length <= this.disable_search_threshold && !this.create_option) {
          this.search_field[0].readOnly = true;
          this.container.addClass("chosen-container-single-nosearch");
        } else {
          this.search_field[0].readOnly = false;
          this.container.removeClass("chosen-container-single-nosearch");
        }
      }
      this.update_results_content(this.results_option_build({
        first: true
      }));
      this.search_field_disabled();
      this.show_search_field_default();
      this.search_field_scale();
      return this.parsing = false;
    }

    result_do_highlight(el) {
      var high_bottom, high_top, maxHeight, visible_bottom, visible_top;
      if (el.length) {
        this.result_clear_highlight();
        this.result_highlight = el;
        this.result_highlight.addClass("highlighted");
        this.search_field.attr("aria-activedescendant", this.result_highlight.attr("id"));
        maxHeight = parseInt(this.search_results.css("maxHeight"), 10);
        visible_top = this.search_results.scrollTop();
        visible_bottom = maxHeight + visible_top;
        high_top = this.result_highlight.position().top + this.search_results.scrollTop();
        high_bottom = high_top + this.result_highlight.outerHeight();
        if (high_bottom >= visible_bottom) {
          return this.search_results.scrollTop((high_bottom - maxHeight) > 0 ? high_bottom - maxHeight : 0);
        } else if (high_top < visible_top) {
          return this.search_results.scrollTop(high_top);
        }
      }
    }

    result_clear_highlight() {
      if (this.result_highlight) {
        this.result_highlight.removeClass("highlighted");
      }
      return this.result_highlight = null;
    }

    results_show() {
      if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
        this.form_field_jq.trigger("chosen:maxselected", {
          chosen: this
        });
        return false;
      }
      if (this.should_dropup()) {
        this.container.addClass("chosen-dropup");
      }
      this.container.addClass("chosen-with-drop");
      this.results_showing = true;
      this.search_field.attr("aria-expanded", true);
      this.search_field.trigger("focus");
      this.search_field.val(this.get_search_field_value());
      this.winnow_results();
      return this.form_field_jq.trigger("chosen:showing_dropdown", {
        chosen: this
      });
    }

    update_results_content(content) {
      return this.search_results.html(content);
    }

    fire_search_updated(search_term) {
      return this.form_field_jq.trigger("chosen:search_updated", {
        chosen: this,
        search_term: search_term
      });
    }

    results_hide() {
      if (this.results_showing) {
        this.result_clear_highlight();
        this.container.removeClass("chosen-with-drop");
        this.container.removeClass("chosen-dropup");
        this.form_field_jq.trigger("chosen:hiding_dropdown", {
          chosen: this
        });
      }
      this.search_field.attr("aria-expanded", false);
      return this.results_showing = false;
    }

    set_tab_index(el) {
      var ti;
      if (this.form_field.tabIndex) {
        ti = this.form_field.tabIndex;
        this.form_field.tabIndex = -1;
        return this.search_field[0].tabIndex = ti;
      }
    }

    set_label_behavior() {
      this.form_field_label = this.form_field_jq.parents("label"); // first check for a parent label
      if (!this.form_field_label.length && this.form_field.id.length) {
        this.form_field_label = $(`label[for='${this.form_field.id}']`);
      }
      if (this.form_field_label.length > 0) {
        return this.form_field_label.on('click.chosen', this.label_click_handler);
      }
    }

    set_search_field_placeholder() {
      if (this.is_multiple && this.choices_count() < 1) {
        return this.search_field.attr('placeholder', this.default_text);
      } else {
        return this.search_field.attr('placeholder', '');
      }
    }

    show_search_field_default() {
      this.search_field.val('');
      this.set_search_field_placeholder();
      if (this.is_multiple && this.choices_count() < 1 && !this.active_field) {
        return this.search_field.addClass("default");
      } else {
        return this.search_field.removeClass("default");
      }
    }

    search_results_mouseup(evt) {
      var target;
      if (this.mousedown_checker(evt) === 'left') {
        target = $(evt.target).is(".active-result,.group-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
        if (target.length) {
          this.result_highlight = target;
          this.result_select(evt);
          return this.search_field.focus();
        }
      }
    }

    search_results_mouseover(evt) {
      var target;
      target = $(evt.target).hasClass("active-result") ? $(evt.target) : $(evt.target).parents(".active-result").first();
      if (target) {
        return this.result_do_highlight(target);
      }
    }

    search_results_mouseout(evt) {
      if ($(evt.target).hasClass("active-result") || $(evt.target).parents('.active-result').first()) {
        return this.result_clear_highlight();
      }
    }

    choice_build(item) {
      var choice, close_link, itemClasses;
      // Add templating feature for wcapf
      // choice = $('<li />', { class: "search-choice", "data-value": item.value, role: "option" }).html("<span>#{this.choice_label(item)}</span>")
      choice = $('<li />', {
        class: "search-choice",
        "data-value": item.value,
        role: "option"
      }).html(`<span class='chosen-choice-inner'>${this.choice_label(item)}</span>`);
      if (item.disabled) {
        choice.addClass('search-choice-disabled');
      } else {
        // Add the x for wcapf
        close_link = $('<button />', {
          type: 'button',
          tabindex: -1,
          class: 'search-choice-close',
          'data-option-array-index': item.data['data-option-array-index']
        }).text("✕");
        close_link.on('click.chosen', (evt) => {
          return this.choice_destroy_link_click(evt);
        });
        choice.append(close_link);
      }
      if (this.inherit_option_classes && item.classes) {
        // choice[0].classList.add item.classes
        // Add the classes one by one for wcapf
        itemClasses = item.classes.split(' ');
        itemClasses.forEach(function(itemClass) {
          return choice[0].classList.add(itemClass);
        });
      }
      return this.search_container.before(choice);
    }

    choice_destroy_link_click(evt) {
      evt.preventDefault();
      evt.stopPropagation();
      if (!this.is_disabled) {
        return this.choice_destroy($(evt.target));
      }
    }

    choice_destroy(link) {
      if (this.result_deselect(link[0].getAttribute("data-option-array-index"))) {
        if (this.active_field) {
          this.search_field.trigger("focus");
        } else {
          this.show_search_field_default();
        }
        if (this.is_multiple && this.hide_results_on_select && this.choices_count() > 0 && this.get_search_field_value().length < 1) {
          this.results_hide();
        }
        link.parents('li').first().remove();
        this.set_search_field_placeholder();
        return this.search_field_scale();
      }
    }

    results_reset() {
      this.reset_single_select_options();
      this.form_field.options[0].selected = true;
      this.single_set_selected_text();
      this.show_search_field_default();
      this.results_reset_cleanup();
      this.trigger_form_field_change();
      if (this.active_field) {
        return this.results_hide();
      }
    }

    results_reset_cleanup() {
      this.current_selectedIndex = this.form_field.selectedIndex;
      return this.selected_item.find('.search-choice-close').remove();
    }

    result_select(evt) {
      var high, item;
      if ($(evt.target).hasClass("group-result")) {
        if (!this.can_select_by_group) {
          return;
        }
        $(evt.target).nextAll().each((_, option) => {
          var array_index, is_chosen;
          if (!$(option).hasClass("group-result")) {
            array_index = $(option).attr("data-option-array-index");
            is_chosen = false;
            $('#pops_chosen > .chosen-choices').find('.search-choice-close').each((_, choice) => {
              if ($(choice).attr("data-option-array-index") === array_index) {
                is_chosen = true;
                return false;
              }
            });
            if (!is_chosen) {
              this.result_highlight = $(option);
              evt.target = option;
              evt.selected = true;
              return this.result_select(evt);
            }
          } else {
            return false;
          }
        });
        return;
      }
      if (this.result_highlight) {
        high = this.result_highlight;
        if (high.hasClass("create-option")) {
          this.select_create_option(this.search_field.val());
          return this.results_hide();
        }
        this.result_clear_highlight();
        if (this.is_multiple && this.max_selected_options <= this.choices_count()) {
          this.form_field_jq.trigger("chosen:maxselected", {
            chosen: this
          });
          return false;
        }
        if (this.is_multiple) {
          high.removeClass("active-result");
        } else {
          this.reset_single_select_options();
        }
        high.addClass("result-selected");
        item = this.results_data[high[0].getAttribute("data-option-array-index")];
        item.selected = true;
        this.form_field.options[item.options_index].selected = true;
        this.selected_option_count = null;
        if (this.is_multiple) {
          this.choice_build(item);
        } else {
          this.single_set_selected_text(this.choice_label(item));
        }
        if (this.is_multiple && (!this.hide_results_on_select || (evt.metaKey || evt.ctrlKey))) {
          if (evt.metaKey || evt.ctrlKey) {
            this.winnow_results({
              skip_highlight: true
            });
          } else {
            this.search_field.val("");
            this.winnow_results();
          }
        } else {
          this.results_hide();
          this.show_search_field_default();
        }
        if (this.is_multiple || this.form_field.selectedIndex !== this.current_selectedIndex) {
          this.trigger_form_field_change({
            selected: this.form_field.options[item.options_index].value
          });
        }
        this.current_selectedIndex = this.form_field.selectedIndex;
        evt.preventDefault();
        return this.search_field_scale();
      }
    }

    single_set_selected_text(text = this.default_text) {
      if (text === this.default_text) {
        this.selected_item.addClass("chosen-default");
      } else {
        this.single_deselect_control_build();
        this.selected_item.removeClass("chosen-default");
      }
      // Add templating feature for wcapf
      // @selected_item.find("span").html(text)
      return this.selected_item.children("span").html(text);
    }

    result_deselect(pos) {
      var result_data;
      result_data = this.results_data[pos];
      if (!this.form_field.options[result_data.options_index].disabled) {
        result_data.selected = false;
        this.form_field.options[result_data.options_index].selected = false;
        this.selected_option_count = null;
        this.result_clear_highlight();
        if (this.results_showing) {
          this.winnow_results();
        }
        this.trigger_form_field_change({
          deselected: this.form_field.options[result_data.options_index].value
        });
        this.search_field_scale();
        return true;
      } else {
        return false;
      }
    }

    single_deselect_control_build() {
      if (!this.allow_single_deselect) {
        return;
      }
      if (!this.selected_item.find('.search-choice-close').length) {
        this.selected_item.find('span').first().after('<button type="button" tabindex="-1" class="search-choice-close"></button>');
      }
      return this.selected_item.addClass('chosen-single-with-deselect');
    }

    get_search_field_value() {
      return this.search_field.val();
    }

    get_search_text() {
      return $.trim(this.get_search_field_value());
    }

    escape_html(text) {
      return $('<div/>').text(text).html();
    }

    winnow_results_set_highlight() {
      var do_high, selected_results;
      selected_results = !this.is_multiple ? this.search_results.find(".result-selected.active-result") : [];
      do_high = selected_results.length ? selected_results.first() : this.search_results.find(".active-result").first();
      if (do_high != null) {
        return this.result_do_highlight(do_high);
      }
    }

    no_results(terms) {
      var no_results_html;
      no_results_html = this.get_no_results_html(terms);
      this.search_results.append(no_results_html);
      return this.form_field_jq.trigger("chosen:no_results", {
        chosen: this
      });
    }

    show_create_option(terms) {
      var create_option_html;
      create_option_html = this.get_create_option_html(terms);
      return this.search_results.append(create_option_html);
    }

    create_option_clear() {
      return this.search_results.find(".create-option").remove();
    }

    select_create_option(terms) {
      if ($.isFunction(this.create_option)) {
        return this.create_option.call(this, terms);
      } else {
        return this.select_append_option({
          value: terms,
          text: terms
        });
      }
    }

    select_append_option(options) {
      var option;
      option = this.get_option_html(options);
      this.form_field_jq.append(option);
      this.form_field_jq.trigger("chosen:updated");
      this.form_field_jq.trigger("change");
      return this.search_field.trigger("focus");
    }

    no_results_clear() {
      return this.search_results.find(".no-results").remove();
    }

    keydown_arrow() {
      var next_sib;
      if (this.results_showing && this.result_highlight) {
        next_sib = this.result_highlight.nextAll("li.active-result").first();
        if (next_sib) {
          return this.result_do_highlight(next_sib);
        }
      } else if (this.results_showing && this.create_option) {
        return this.result_do_highlight(this.search_results.find('.create-option'));
      } else {
        return this.results_show();
      }
    }

    keyup_arrow() {
      var prev_sibs;
      if (!this.results_showing && !this.is_multiple) {
        return this.results_show();
      } else if (this.result_highlight) {
        prev_sibs = this.result_highlight.prevAll("li.active-result");
        if (prev_sibs.length) {
          return this.result_do_highlight(prev_sibs.first());
        } else {
          if (this.choices_count() > 0) {
            this.results_hide();
          }
          return this.result_clear_highlight();
        }
      }
    }

    keydown_backstroke() {
      var next_available_destroy;
      if (this.pending_backstroke) {
        this.choice_destroy(this.pending_backstroke.find('.search-choice-close').first());
        return this.clear_backstroke();
      } else {
        next_available_destroy = this.search_container.siblings("li.search-choice").last();
        if (next_available_destroy.length && !next_available_destroy.hasClass("search-choice-disabled")) {
          this.pending_backstroke = next_available_destroy;
          if (this.single_backstroke_delete) {
            return this.keydown_backstroke();
          } else {
            return this.pending_backstroke.addClass("search-choice-focus");
          }
        }
      }
    }

    clear_backstroke() {
      if (this.pending_backstroke) {
        this.pending_backstroke.removeClass("search-choice-focus");
      }
      return this.pending_backstroke = null;
    }

    search_field_scale() {
      var div, j, len, style, style_block, styles, width;
      if (!this.is_multiple) {
        return;
      }
      style_block = {
        position: 'absolute',
        left: '-1000px',
        top: '-1000px',
        display: 'none',
        whiteSpace: 'pre'
      };
      styles = ['fontSize', 'fontStyle', 'fontWeight', 'fontFamily', 'lineHeight', 'textTransform', 'letterSpacing'];
      for (j = 0, len = styles.length; j < len; j++) {
        style = styles[j];
        style_block[style] = this.search_field.css(style);
      }
      div = $('<div />').css(style_block);
      div.text(this.get_search_field_value() || this.search_field.attr('placeholder'));
      $('body').append(div);
      width = div.width() + 25;
      div.remove();
      if (this.container.is(':visible')) {
        width = Math.min(this.container.outerWidth() - 10, width);
      }
      return this.search_field.width(width);
    }

    trigger_form_field_change(extra) {
      this.form_field_jq.trigger("input", extra);
      return this.form_field_jq.trigger("change", extra);
    }

  };

}).call(this);
