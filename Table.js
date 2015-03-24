/*global require, module, window*/
var Table = function (properties) {
    'use strict';
    var table = {},
        columnsRender = {},
        columnsGet = {},
        sorting = {},
        m = window.m || require("mithril/mithril"),
        Pagination,
        pagination,
        functionType = Object.prototype.toString.call(function () {});

    if (properties.pagination) {
        Pagination = window.Pagination || require('sm-pagination');
        pagination = new Pagination();
    }

    function defaultSort(key, ascending, getter) {
        return function (a, b) {
            var x = getter(a),
                y = getter(b);
            x = ('' + x).toLowerCase();
            y = ('' + y).toLowerCase();
            return ((x < y) ? -1 : ((x > y) ? 1 : 0)) * (ascending ? 1 : -1);
        };
    }

    function getField(obj) {
        if (Object.prototype.toString.call(obj) === Object.prototype.toString.call('')) {
            return obj;
        } else {
            return obj.field;
        }
    }

    function sortData(sort, key, data, getter) {
        if (!sorting[key]) {
            sorting = {};
        }
        //TODO: ascending?
        sorting[key] = sorting[key] !== undefined ? m.prop(!sorting[key]()) : m.prop(true);
        table.vm.originaldata = data.sort(sort(key, sorting[key](), getter));
    }

    /*
     * Recursively merge properties of two objects
     */
    function mergeRecursive(obj1, obj2) {

        for (var p in obj2) {
            try {
                // Property in destination object set; update its value.
                if (obj2[p].constructor == Object) {
                    obj1[p] = mergeRecursive(obj1[p], obj2[p]);

                } else {
                    obj1[p] = obj2[p];

                }

            } catch (e) {
                // Property in destination object not set; create it and set its value.
                obj1[p] = obj2[p];

            }
        }

        return obj1;
    }

    function buildHeaders(columns) {
        var sortedAscending = table.vm.classes ? (table.vm.classes.sortingAscending || 'sorted ascending') : 'sorted ascending',
            sortedDescending = table.vm.classes ? (table.vm.classes.sortedDescending || 'sorted descending') : 'sorted descending',
            notSorted = table.vm.classes ? (table.vm.classes.notSorted || '') : '',
            disabled = table.vm.classes ? (table.vm.classes.notSorted || 'disabled') : 'disabled';
        return columns.map(function (obj) {
            var field = getField(obj);
            //TODO: get up/down/both classes from properties and merge
            if (Object.prototype.toString.call(obj) === Object.prototype.toString.call('')) {
                //we have a string
                columnsGet[field] = function (item) {
                    return item[field];
                };
                columnsRender[field] = function (item) {
                    return item;
                };
                return m('th', {
                    'class': sorting[field] ? (sorting[field]() ? (' ' + sortedAscending) : (' ' + sortedDescending)) : (' ' + notSorted),
                    onclick: sortData.bind(this, defaultSort, field, table.vm.data, columnsGet[field])
                }, field);
            } else {
                columnsGet[field] = obj.get || function (item) {
                    if (Object.prototype.toString.call(item[field]) === functionType) {
                        return item[field]();
                    }
                    return item[field];
                };
                columnsRender[field] = obj.format || function (val, item) {
                    return columnsGet[field](item);
                };
                return m('th', {
                    'class': (sorting[field] ? (sorting[field]() ? (' ' + sortedAscending) : (' ' + sortedDescending)) : (' ' + notSorted)) +
                        ((obj.sortable === undefined || obj.sortable === true) ? '' : (' ' + disabled)) + ' ' + (obj.classes || ''),
                    onclick: (obj.sortable === undefined || obj.sortable === true) ? sortData.bind(this, obj.sort || defaultSort, field, table.vm.data, columnsGet[field]) : ''
                }, obj.label || field);
            }
        });
    }

    function buildBody(columns, data) {
        var cdata = table.vm.pagination ?
            data.slice(pagination.latest, pagination.rowsperpage * pagination.currentpage) :
            data;
        table.vm.latestData = cdata;
        return cdata.map(function (obj, idx) {
            var rowAttr = {
                    'data-table-idx': idx
                },
                cols;
            cols = columns.map(function (column) {
                var field = getField(column),
                    attr = {
                        'data-table-field': field,
                        'data-table-idx': idx
                    },
                    cell;
                //cell = columnsRender[field](obj[field], attr, rowAttr, idx, columnsGet[field]);
                if (Object.prototype.toString.call(obj[field]) === functionType) {
                    cell = columnsRender[field](obj[field](), obj, attr, rowAttr, idx, columnsGet[field]);
                } else {
                    cell = columnsRender[field](obj[field], obj, attr, rowAttr, idx, columnsGet[field]);
                }
                return m('td', attr, (cell === undefined) ? (columnsGet[field] ? columnsGet[field](obj) : '-') : cell);
            });
            return m('tr', rowAttr, cols);
        });
    }



    function setHeight(element, isInit, context) {
        if (context.length && context.length !== table.vm.originaldata.length) {
            table.vm.minHeight = 0;
            element.style.minHeight = table.vm.minHeight + 'px';
        } else {
            table.vm.minHeight = table.vm.minHeight < element.offsetHeight ? element.offsetHeight : table.vm.minHeight;
            element.style.minHeight = table.vm.minHeight + 'px';
        }
        context.length = table.vm.originaldata.length;
    }

    function showTable(data) {
        table.vm.originaldata = data;
        if (table.vm.filter) {
            table.vm.data = data.filter(table.vm.filter);
        } else {
            table.vm.data = data;
        }
        if (table.vm.pagination) {
            pagination.calculatePagination(table.vm.data, table.vm.pagination.rowsperpage || 10, table.vm.pagination.classes);
        }
        table.vm.minHeight = table.vm.minHeight || 0;
        var attr = {
                'class': table.vm.classes ? (table.vm.classes.table || 'ui table sortable') : 'ui table sortable'
            },
            header = buildHeaders(table.vm.columns),
            body;
        attr = mergeRecursive(attr, table.vm.tableAttr);

        if (table.vm.loading) {
            body = m("tbody", [
                m('tr', [
                    m('td', {
                        colspan: table.vm.columns.length,
                        'class': table.vm.classes ? (table.vm.classes.columnLoading || 'center aligned') : 'center aligned'
                    }, [
                        m('div', {
                            'class': table.vm.classes ? (table.vm.classes.loader || 'ui active loader inline') : 'ui active loader inline'
                        }, '')
                    ])
                ])
            ]);
        } else if (table.vm.data.length) {
            body = m('tbody', {
                onclick: function (e) {
                    m.redraw.strategy("none");
                    if (table.vm.onclick) {
                        table.vm.onclick.call(table.getCell(e), e, table, this.parentNode);
                    }
                }
            }, buildBody(table.vm.columns, table.vm.data));
        } else {
            body = m("tbody", [
                m('tr', [
                    m('td', {
                        colspan: table.vm.columns.length,
                        'class': table.vm.classes ? (table.vm.classes.columnNoResults || 'center aligned') : 'center aligned'
                    }, 'No Results Found')
                ])
            ]);
        }
        return [
            m('div', {
                config: setHeight
            }, [
                m("table", attr, [
                    m('thead', [
                        m('tr', header)
                    ]),
                    body,
                    m('tfoot', table.vm.footer)
                ])
            ]),
            (table.vm.pagination && !table.vm.loading) ? pagination.buildPagination() : ''
        ];
    }

    table.vm = properties;

    if (table.vm.url) {
        table.vm.data = m.request({method: "GET", url: "/admin/system/customers", type: table.vm.type});
    }

    table.view = function (data) {
        if (!data) {
            data = table.vm.originaldata || table.vm.data;
        } else {
            if (Object.prototype.toString.call(data) !== Object.prototype.toString.call([])) {
                data = data.data || table.vm.originaldata || table.vm.data;
            }
        }
        if (Object.prototype.toString.call(data) === functionType) {
            //data its a function, lets get the data
            if (data.then) {
                table.vm.loading = true;
                data.then(function (data) {
                    table.vm.loading = false;
                    table.view(data);
                });
            }
            data = data();
        }
        if (Object.prototype.toString.call(data) !== Object.prototype.toString.call([])) {
            throw new Error('table needs an array of data');
        }
        return showTable(data);
    };

    table.goToPage = function (page) {
        if (table.vm.pagination) {
            if (page < 1 || page > pagination.pages) {
                return;
            }
            pagination.goToPage(page);
        }
    };

    table.getCell = function (e) {
        if (e && e.preventDefault) {
            //we have an event maybe?
            var cell = e.target || e.srcElement || e.originalTarget;
            if (cell.tagName.toLowerCase() !== 'td') {
                while (cell.parentNode) {
                    cell = cell.parentNode;
                    if (cell.tagName && cell.tagName.toLowerCase() === 'td') {
                        break;
                    }
                }
            }
            return cell;
        }
        return null;
    };

    table.getRow = function (e) {
        var row = null;
        if (!e) {
            return row;
        }
        if (e.preventDefault) {
            //we have an event maybe?
            row = e.target || e.srcElement || e.originalTarget;
        } else if (e.tagName) {
            //we have a tag
            row = e;
        } else {
            //have object?
            return row;
        }
        if (row.tagName.toLowerCase() !== 'tr') {
            while (row.parentNode) {
                row = row.parentNode;
                if (row.tagName && row.tagName.toLowerCase() === 'tr') {
                    break;
                }
            }
        }
        return row;
    };

    table.getData = function (e, justCell) {
        var cell = table.getCell(e),
            row = table.getRow(cell),
            field,
            idx;
        if (cell && row) {
            if (justCell) {
                field = cell.getAttribute('data-table-field');
            }
            idx = row.getAttribute('data-table-idx');
            if (idx) {
                if (justCell) {
                    if (field) {
                        return table.vm.latestData[idx][field];
                    }
                    return null;
                }
                return table.vm.latestData[idx];
            }
        }
        return null;
    };

    table.setData = function (data) {
        table.vm.loading = false;
        table.view(data);
    };

    return table;
};
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Table;
}
