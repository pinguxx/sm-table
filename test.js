/*global m, Table, window*/
(function (m, Table) {
    'use strict';
    var array = [],
        array2 = [],
        i,
        module = {};

    for (i = 1; i < 11; i += 1) {
        array.push({
            id: i,
            name: 'name ' + i
        });
    }

    for (i = 1; i < 5111; i += 1) {
        array2.push({
            id: m.prop(i),
            name: m.prop('name ' + i),
            location: m.prop('location ' + i),
            city: m.prop(i % 2 ? 'not other' : 'other'),
            status: m.prop(i % 2 ? true : false)
        });
    }

    module.controller = function () {
        module.vm.init(array);
    };

    module.vm = {};
    module.vm.init = function (data) {
        this.customers = data;
        this.rowsperpage = 10;
        this.filter = m.prop('');
    };


    module.view = function (/*ctrl*/) {
        return m('.ui.grid.page', [
            m('h1', 'Basic Table'),
            m('.ui.sixteen.wide.column', [
                m.component(Table, {
                    columns: ['id', 'name'],
                    data: module.vm.customers
                })
            ]),
            m('h1', 'Pagination Table'),
            m('.row.two.column', [
                m('.column', {
                    style: 'margin-top:7px;'
                }, [
                    m('.header.input', 'Search Results')
                ]),
                m('.column.right.aligned', [
                    m('.ui.mini.input', [
                        m('input[placeholder="Filter by Name"][type="text"]', {
                            onkeyup: m.withAttr('value', module.vm.filter),
                            value: module.vm.filter()
                        })
                    ])
                ])
            ]),
            m('.row.rs-nopaddingtop', [
                m('.ui.column.col-sm-11', [
                    m.component(Table, {
                        columns: [
                            {
                                field: 'name',
                                label: 'Name',
                                format: function (val, obj, celAttr, rowAttr, idx, getter) {
                                    return obj.name() ?
                                        m('a', {
                                            href: '/edit/' + obj.id(),
                                            config: m.route
                                        }, obj.name()) :
                                        m('span', '-');
                                },
                                sort: function (key, ascending, getter) {
                                    return function (a, b) {
                                        var x = getter(a),
                                            y = getter(b);
                                        x = ('' + x);
                                        y = ('' + y);
                                        return ((x < y) ? -1 : ((x > y) ? 1 : 0)) * (!ascending ? -1 : 1);
                                    };
                                },
                                classes: 'col-sm-5'
                            },
                            {
                                field: 'location',
                                label: 'Location',
                                get: function (obj) {
                                    return (obj.location() ? obj.location() + ', ' : '') + (obj.city() ? obj.city() + ' ' : '');
                                }
                            },
                            {
                                field: 'status',
                                label: 'Action',
                                sortable: false,
                                format: function (val, obj) {
                                    return !obj.status() ? m('a[href="#"]', 'Activate') : m('a[href="#"]', 'Deactivate');
                                }
                            }
                        ],
                        data: array2,
                        pagination: {
                            rowsperpage: 10/*,
                            classes: {
                                leftIconClass: 'glyphicon glyphicon-arrow-left',
                                rightIconClass: 'glyphicon glyphicon-arrow-right'
                            }*/
                        },
                        filter: function (item) {
                            return item.name().indexOf(module.vm.filter()) > -1;
                        },
                        onclick: function (e, table, tableEl) {
                            console.log(e, table, this, tableEl);
                            console.log(table.getCell(e));
                            console.log(table.getRow(e));
                            console.log(table.getData(e).name());
                        }/*,
                        classes: {
							table: 'table table-striped table-bordered',
                            sortingAscending: 'glyphicon glyphicon-chevron-up',
                            sortedDescending: 'glyphicon glyphicon-chevron-down'
                        }*/
                    })
                ])
            ])
        ]);
    };

    m.module(window.document.body, module);
}(m, Table));
