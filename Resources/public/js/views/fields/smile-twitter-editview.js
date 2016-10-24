YUI.add('smile-twitter-editview', function (Y) {
    "use strict";
    Y.namespace('Smile');

    var L = Y.Lang,
        FIELDTYPE_IDENTIFIER = 'smiletwitter',
        IS_LIST_HIDDEN = 'is-list-hidden',
        IS_TOP_LIST = 'is-top-list';

    Y.Smile.TwitterEditView = Y.Base.create('twitterEditView', Y.eZ.FieldEditView, [], {
        VALUES_TPL: '<li class="ez-selection-value smile-twitter-type-value" />',

        events: {
            '.smile-twitter-type-values': {
                'tap': '_toggleShowSelectionTypeUI',
            },
            '.smile-twitter-type-value': {
                'tap': '_removeTypeValue'
            },
        },

        initializer: function () {
            var config = this.get('config');

            this._useStandardFieldDefinitionDescription = false;
            this.containerTemplate = '<div class="' +
                this._generateViewClassName(this._getName()) + ' ' +
                this._generateViewClassName(Y.eZ.SelectionEditView.NAME) + '"/>';

            if ( config && config.twitterTypesInfo ) {
                this._set('twitterTypeList', config.twitterTypesInfo);
            }

            if ( config && config.twitterOptionsInfo ) {
                this._set('twitterOptionList', config.twitterOptionsInfo);
            }

            this._selectionTypeFilter = null;
            this._clickoutsideHandler = null;
            this._useStandardFieldDefinitionDescription = false;

            this.after('activeChange', function (e) {
                if ( e.newVal ) {
                    this._initSelectionTypeFilter();
                    this._initTwitterOptions();
                }
            });

            var field = this.get('field');
            if (field && field.fieldValue) {
                var fieldValue = Y.JSON.parse(field.fieldValue);
                field.fieldValue = fieldValue;
                this._set('field', field);
            }

            this._set('typeValues', this._getSelectedTextTypeValues());

            this.after('fieldChange', function (e) {
                this._set('typeValues', this._getSelectedTextTypeValues());
            });
            this.after('showSelectionUIChange', this._uiShowSelectionTypeList);
        },

        _initSelectionTypeFilter: function () {
            var container = this.get('container');

            this._selectionTypeFilter = this._getSelectionTypeFilter();

            this._selectionTypeFilter.on('select', Y.bind(function (e) {
                this.set('showSelectionUI', false);

                this._addSelectionType({text: e.attributes.text, key: e.attributes.key});
            }, this));

            this._selectionTypeFilter.on('unselect', Y.bind(function (e) {
                this._removeSelectionType(e.text);
            }, this));

            this._selectionTypeFilter.render();
            this._clickoutsideHandler = this.get('container').one('.smile-twitter-type-input-ui').on(
                'clickoutside', Y.bind(function (e) {
                    this.set('showSelectionUI', false);
                }, this)
            );
            this._selectionTypeFilter.resetFilter();
            container.addClass(IS_LIST_HIDDEN);
            this._attachedViewEvents.push(this._clickoutsideHandler);
        },

        _addSelectionType: function (value) {
            var values = this.get('typeValues');

            values.push(value);
            this._set('typeValues', values, {"added": value});

            this._uiSyncSelectionTypeValues({"added": value});
        },

        _removeSelectionType: function (value, node) {
            var values = this.get('typeValues');

            values = Y.Array.reject(values, function (val) {
                return (typeof val === 'object' ? val.text === value : val === value);
            });

            this._selectionTypeFilter.unselect(value);
            this._set('typeValues', values, {
                "removed": value,
                "node": node || null
            });

            this._uiSyncSelectionTypeValues({
                "removed": value,
                "node": node || null
            });
        },

        _uiSyncSelectionTypeValues: function (e) {
            var selectionValues = this.get('container').one('.smile-twitter-type-values'),
                node;

            if ( e.added ) {
                if ( typeof e.added === "object" ) {
                    node = Y.Node.create(this.VALUES_TPL).setContent(e.added.text);
                    Y.Object.each(e.added, function (value, key) {
                        node.setAttribute('data-' + key, value);
                    });
                } else {
                    node = Y.Node.create(this.VALUES_TPL).setContent(e.added);
                    node.setAttribute('data-text', e.added);
                }
                selectionValues.append(node);
            } else if ( e.removed ) {
                if ( e.node ) {
                    node = e.node;
                } else {
                    node = selectionValues.one('.smile-twitter-type-value[data-text="' + e.removed + '"]');
                }
                if (node) {
                    node.remove(true);
                }
            }
        },

        _validateAddedRemovedTypeValues: function (e) {
            if ( e.added || e.removed ) {
                this.validate();
            }
        },

        _uiShowSelectionTypeList: function (e) {
            var container = this.get('container');

            if ( e.newVal ) {
                if ( this._isTopList() ) {
                    container.addClass(IS_TOP_LIST);
                } else {
                    container.removeClass(IS_TOP_LIST);
                }
                container.removeClass(IS_LIST_HIDDEN);
                this._selectionTypeFilter.resetFilter();
                this._selectionTypeFilter.focus();
            } else {
                this._selectionTypeFilter.resetFilter();
                container.addClass(IS_LIST_HIDDEN);
            }
            this.validate();
        },

        _toggleShowSelectionTypeUI: function (e) {
            if ( !e.target || !e.target.hasClass('smile-twitter-type-value') ) {
                this.set('showSelectionUI', !this.get('showSelectionUI'));
            }
        },

        _removeTypeValue: function (e) {
            this._removeSelectionType(e.target.getAttribute('data-text'), e.target);
        },

        _isTopList: function () {
            var c = this._selectionTypeFilter.get('container'),
                bottomSpace;

            bottomSpace = c.get('winHeight') + c.get('docScrollY') - Math.round(c.getY());
            return c.get('offsetHeight') > bottomSpace;
        },

        /****/

        _getSelectionTypeFilter: function () {
            var container = this.get('container'),
                selectedObjectArray = this._getSelectedTextTypeValues(),
                input = container.one('.smile-twitter-type-filter-input'),
                source = this._getTypeSource(),
                selected = [];

            Y.Array.each(selectedObjectArray, function (selectedObject) {
                selected.push(selectedObject.text);
            });
            this._set('selecteTypesd', selected);
            return new Y.eZ.SelectionFilterView({
                container: input.get('parentNode'),
                inputNode: input,
                listNode: this.get('container').one('.smile-twitter-type-options'),
                selected: selected,
                source: source,
                filter: false,
                resultFilters: 'startsWith',
                resultHighlighter: 'startsWith',
                isMultiple: false,
                resultTextLocator: function (sourceElement) {
                    return sourceElement.Name;
                },
                resultAttributesFormatter: function (sourceElement) {
                    return {
                        text: sourceElement.Name,
                        key: sourceElement.Key
                    };
                },
            });
        },

        _getSelectedTextTypeValues: function () {
            var field = this.get('field'),
                valueIndexes = [],
                that =  this,
                res = [];

            if ( field && field.fieldValue ) {
                valueIndexes = field.fieldValue.type;
            }
            res.push({text: that._getTypeName(valueIndexes), key: valueIndexes});
            return res;
        },

        _getTypeName: function (key) {
            var typeList = this._getTypeList();

            if (typeList[key]) {
                return typeList[key].Name;
            } else {
                console.warn("Unknown type key: " + key);
                return key;
            }
        },

        _getTypeSource: function () {
            var typesArray = [];

            Y.Object.each(this._getTypeList(), function (type) {
                typesArray.push(type);
            });
            return typesArray;
        },

        _getTypeList: function () {
            var config = this.get('config');

            if ( config && config.twitterTypesInfo ) {
                return config.twitterTypesInfo;
            }
            return {};
        },

        /****/

        _variables: function () {
            var def = this.get('fieldDefinition');

            return {
                "isRequired": def.isRequired,
                "twitterOptionList": this.get('twitterOptionList'),
                "selectedTypes": this._getSelectedTextTypeValues()
            };
        },

        _getFieldValue: function () {
            var fieldValue = {
                    title: this._getInputFieldValue('title'),
                    type: this.get('container').one('.smile-twitter-type-value').getAttribute('data-key'),
                    user: this._getInputFieldValue('user'),
                    options: this._getOptionValues(),
                };

            return fieldValue;
        },

        _getInputFieldValue: function (property) {
            var input = this.get('container').one('.smile-twitter-' + property + '-value');

            return input.get('value');
        },

        _getOptionValues: function () {
            var options = {};

            var chromeOptions = this.get('container').all('.smile-twitter-options-chrome-values[checked="checked"]'),
                chromeValues = [];
            chromeOptions.each(function(chromeValue) {
                chromeValues.push(chromeValue);
            });
            options.chrome = chromeValues;

            return options;
        },

        /*****/

        _initTwitterOptions: function () {
        },
    });

    Y.eZ.FieldEditView.registerFieldEditView(
        FIELDTYPE_IDENTIFIER, Y.Smile.TwitterEditView
    );
});
