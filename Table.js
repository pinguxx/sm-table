/*global require, module, window*/
(function () {
    'use strict';
    var m = window.m || require('mithril/mithril'),
        functionType = Object.prototype.toString.call(function () {}),
        arrayType = Object.prototype.toString.call([]),
        Pagination = window.Pagination || require('sm-pagination');

    /*
     * Recursively merge properties of two objects
     */
    function mergeRecursive(obj1, obj2) {
        var p;
        for (p in obj2) {
            if (obj2.hasOwnProperty(p)) {
                try {
                    // Property in destination object set; update its value.
                    if (obj2[p].constructor === Object) {
                        obj1[p] = mergeRecursive(obj1[p], obj2[p]);

                    } else {
                        obj1[p] = obj2[p];

                    }

                } catch (e) {
                    // Property in destination object not set; create it and set its value.
                    obj1[p] = obj2[p];

                }
            }
        }

        return obj1;
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

    function sortData(ctrl, sort, key, data, getter) {
        if (!ctrl.sorting[key]) {
            ctrl.sorting = {};
        }
        //TODO: ascending?
        ctrl.sorting[key] = ctrl.sorting[key] !== undefined ? m.prop(!ctrl.sorting[key]()) : m.prop(true);
        ctrl.originaldata = data.sort(sort(key, ctrl.sorting[key](), getter));
    }

    function getData(ctrl) {
        var data = ctrl.data;
        if (!data) {
            data = ctrl.originaldata || ctrl.data;
        } else {
            if (Object.prototype.toString.call(data) !== arrayType) {
                data = data.data || ctrl.originaldata || ctrl.data;
            }
        }
        return data;
    }

    function checkRowEvent(e) {
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
        return row;
    }

    function getSimpleHeader(ctrl, field, sortedClass) {
        //we have a string
        ctrl.columnsGet[field] = function (item) {
            return item[field];
        };
        ctrl.columnsRender[field] = function (item) {
            return item;
        };
        return m('th', {
            onclick: sortData.bind(this, ctrl, defaultSort, field, ctrl.data, ctrl.columnsGet[field])
        }, [
            field,
            m('i', {
              'class': sortedClass,
                style: 'float:right;'
            })
        ]);
    }

    function getComplexHeader(ctrl, obj, disabled, field, sortedClass) {
        var thObj = {};
        ctrl.columnsGet[field] = obj.get || function (item) {
            if (Object.prototype.toString.call(item[field]) === functionType) {
                return item[field]();
            }
            return item[field];
        };
        ctrl.columnsRender[field] = obj.format || function (val, item) {
            return ctrl.columnsGet[field](item);
        };
        if (obj.sortable === undefined || obj.sortable === true) {
            thObj = {
                'class': obj.classes || '',
                onclick: sortData.bind(this, ctrl, obj.sort || defaultSort, field, ctrl.data, ctrl.columnsGet[field])
            };
        } else {
            thObj = {
                'class': disabled + ' ' + (obj.classes || '')
            };
        }
        return m('th', thObj, [
            obj.label || field,
            m('i', {
              'class': sortedClass,
                style: 'float:right;'
            })
        ]);
    }

    var Table = {
        controller: function (properties) {
            var ctrl = this,
                classes;

            classes = {
                table: 'ui table sortable',
                columnLoading: 'center aligned',
                loader: 'ui active loader inline',
                sortingAscending: 'icon chevron up',
                sortedDescending: 'icon chevron down',
                notSorted: '',
                disabled: 'disabled'
            };

            ctrl = mergeRecursive(ctrl, properties);

            //ctrl.pagination = null;
            ctrl.columnsGet = {};
            ctrl.columnsRender = {};
            ctrl.sorting = {};

            ctrl.classes = mergeRecursive(classes, properties.classes || {});

            if (ctrl.url) {
                ctrl.data = m.request({
                    method: 'GET',
                    url: '/admin/system/customers',
                    type: ctrl.type
                });
            }
        },
        view: function (ctrl, args) {
            this.ctrl = ctrl;
            var data = getData(ctrl);
            if (Object.prototype.toString.call(data) === functionType) {
                //data its a function, lets get the data
                if (data.then) {
                    ctrl.loading = true;
                    data.then(function (cdata) {
                        ctrl.loading = false;
                        ctrl.view(cdata);
                    });
                }
                data = data();
            }
            if (Object.prototype.toString.call(data) !== arrayType) {
                throw new Error('table needs an array of data');
            }
            if (!ctrl.originaldata) {
                ctrl.originaldata = args.data;
            }
            return this.showTable(ctrl, data);
        },
        showTable: function (ctrl) {
            var table = this,
                attr,
                header;
            //ctrl.data = data;
            if (ctrl.filter) {
                ctrl.data = ctrl.originaldata.filter(ctrl.filter);
            } else {
                ctrl.data = ctrl.originaldata;
            }
            ctrl.minHeight = ctrl.minHeight || 0;
            attr = {
                'class': ctrl.classes.table
            };
            header = this.buildHeaders(ctrl, ctrl.columns);
            attr = mergeRecursive(attr, ctrl.tableAttr);

            function bodyr(data) {
                if (ctrl.loading) {
                    return m('tbody', [
                        m('tr', [
                            m('td', {
                                colspan: ctrl.columns.length,
                                'class': ctrl.classes.columnLoading
                            }, [
                                m('div', {
                                    'class': ctrl.classes.loader
                                }, '')
                            ])
                        ])
                    ]);
                } else if (data.length) {
                    return m('tbody', {
                        onclick: function (e) {
                            m.redraw.strategy('none');
                            if (ctrl.onclick) {
                                ctrl.onclick.call(table.getCell(e), e, table, this.parentNode);
                            }
                        }
                    }, table.buildBody(ctrl, ctrl.columns, data));
                } else {
                    return m('tbody', [
                        m('tr', [
                            m('td', {
                                colspan: ctrl.columns.length,
                                'class': ctrl.classes ? (ctrl.classes.columnNoResults || 'center aligned') : 'center aligned'
                            }, 'No Results Found')
                        ])
                    ]);
                }
            }


            if (ctrl.pagination && !ctrl.loading) {
                return m.component(Pagination, {
                    data: ctrl.data,
                    rowsperpage: ctrl.pagination.rowsperpage,
                    pagerender: function (data) {
                        return m('div', {
                            /*config: setHeight*/
                        }, [
                            m('table', attr, [
                                m('thead', [
                                    m('tr', header)
                                ]),
                                bodyr(data),
                                m('tfoot', ctrl.footer)
                            ])
                        ]);
                    },
                    wrapperclass: 'sm-table',
                    classes: ctrl.pagination.classes
                });
            } else {
                return m('sm-table', {
                    /*config: setHeight*/
                }, [
                    m('table', attr, [
                        m('thead', [
                            m('tr', header)
                        ]),
                        bodyr(ctrl.data),
                        m('tfoot', ctrl.footer)
                    ])
                ]);
            }
        },
        buildBody: function (ctrl, columns, data) {
            /*var cdata = ctrl.pagination ?
                data.slice(pagination.latest, pagination.rowsperpage * pagination.currentpage) :
                data;*/
            ctrl.latestData = data;
            return data.map(function (obj, idx) {
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
                    //cell = ctrl.columnsRender[field](obj[field], attr, rowAttr, idx, ctrl.columnsGet[field]);
                    if (Object.prototype.toString.call(obj[field]) === functionType) {
                        cell = ctrl.columnsRender[field](obj[field](), obj, attr, rowAttr, idx, ctrl.columnsGet[field]);
                    } else {
                        cell = ctrl.columnsRender[field](obj[field], obj, attr, rowAttr, idx, ctrl.columnsGet[field]);
                    }
                    return m('td', attr, (cell === undefined) ? (ctrl.columnsGet[field] ? ctrl.columnsGet[field](obj) : '-') : cell);
                });
                return m('tr', rowAttr, cols);
            });
        },
        buildHeaders: function (ctrl, columns) {
            var sortedAscending = ctrl.classes.sortingAscending,
                sortedDescending = ctrl.classes.sortedDescending,
                notSorted = ctrl.classes.notSorted,
                disabled = ctrl.classes.disabled;
            return columns.map(function (obj) {
                var field = getField(obj),
                    sortedClass = ctrl.sorting[field] ? (ctrl.sorting[field]() ? (' ' + sortedAscending) : (' ' + sortedDescending)) : (' ' + notSorted);
                //TODO: get up/down/both classes from properties and merge
                if (Object.prototype.toString.call(obj) === Object.prototype.toString.call('')) {
                    return getSimpleHeader(ctrl, field, sortedClass);
                } else {
                    return getComplexHeader(ctrl, obj, disabled, field, sortedClass);
                }
            });
        },
        goToPage: function (page) {
            var table = this;
            if (table.ctrl.pagination) {
                if (page < 1 || page > table.ctrl.pagination.pages) {
                    return;
                }
                table.ctrl.pagination.goToPage(page);
            }
        },
        getCell: function (e) {
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
        },
        getRow: function (e) {
            var row = checkRowEvent(e);
            if (row.tagName.toLowerCase() !== 'tr') {
                while (row.parentNode) {
                    row = row.parentNode;
                    if (row.tagName && row.tagName.toLowerCase() === 'tr') {
                        break;
                    }
                }
            }
            return row;
        },
        getData: function (e, justCell) {
            var table = this,
                ctrl = table.ctrl,
                cell = table.getCell(e),
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
                            return ctrl.latestData[idx][field];
                        }
                        return null;
                    }
                    return ctrl.latestData[idx];
                }
            }
            return null;
        },
        setData: function (data) {
            var table = this;
            table.vm.loading = false;
            table.view(data);
        }
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = Table;
    } else {
        window.Table = Table;
    }
}());
