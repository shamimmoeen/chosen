class SelectParser

  constructor: (options) ->
    @options_index = 0
    @parsed = []
    @copy_data_attributes = options.copy_data_attributes || false

  add_node: (child) ->
    if child.nodeName.toUpperCase() is "OPTGROUP"
      this.add_group child
    else
      this.add_option child

  add_group: (group) ->
    group_position = @parsed.length
    @parsed.push
      array_index: group_position
      group: true
      label: group.label
      title: group.title if group.title
      children: 0
      disabled: group.disabled
      hidden: group.hidden
      classes: group.className
    this.add_option( option, group_position, group.disabled ) for option in group.childNodes

  # Add templating feature for wcapf
  # source: https://github.com/harvesthq/chosen/pull/692
  get_template_data: (option) ->
    template_data = {}

    for k, v of option.attributes
      if typeof(v.nodeName) == "string"
        attribute_name = v.nodeName.split("-")

        if attribute_name[0] == "data" and attribute_name = attribute_name[1..]
          for word, i in attribute_name
            attribute_name[i] = word.charAt(0).toUpperCase() + word.slice(1) if i != 0

          template_data[attribute_name.join("")] = v.nodeValue 

    template_data

  add_option: (option, group_position, group_disabled) ->
    if option.nodeName.toUpperCase() is "OPTION"
      if option.text != ""
        if group_position?
          @parsed[group_position].children += 1
        @parsed.push
          options_index: @options_index
          value: option.value
          text: option.text
          html: option.innerHTML.replace(/^\s+|\s+$/g, '')
          title: option.title if option.title
          selected: option.selected
          disabled: if group_disabled is true then group_disabled else option.disabled
          hidden: option.hidden
          group_array_index: group_position
          group_label: if group_position? then @parsed[group_position].label else null
          classes: option.className
          style: option.style.cssText
          data: this.parse_data_attributes(option)
          # Add templating feature for wcapf
          template_data: @get_template_data(option)
      else
        @parsed.push
          options_index: @options_index
          empty: true
          data: this.parse_data_attributes(option)
      @options_index += 1

  parse_data_attributes: (option) ->
    dataAttr = { 'data-option-array-index' : this.parsed.length, 'data-value' : option.value }
    if @copy_data_attributes && option
      for attr in option.attributes
        attrName = attr.nodeName
        if /data-.*/.test(attrName)
          dataAttr[ attrName ] = attr.nodeValue
    return dataAttr

SelectParser.select_to_array = (select, options) ->
  parser = new SelectParser(options)
  parser.add_node( child ) for child in select.childNodes
  parser.parsed
