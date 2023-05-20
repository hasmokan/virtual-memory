<template>
    <div class="App">
        <el-radio-group v-model="labelPosition" label="label position">
            <el-radio-button label="left">Left</el-radio-button>
            <el-radio-button label="right">Right</el-radio-button>
            <el-radio-button label="top">Top</el-radio-button>
        </el-radio-group>
        <div style="margin: 20px" />
        <el-form
            :label-position="labelPosition"
            label-width="100px"
            :model="form1"
            style="max-width: 460px"
        >
            <el-form-item label="进程序号">
                <el-input v-model="form1.id" />
            </el-form-item>
            <el-form-item label="进程段数">
                <el-input v-model="form1.fnum" />
            </el-form-item>
            <el-form-item label="段长1(KB)">
                <el-input v-model="form1.f1" />
            </el-form-item>
            <el-form-item label="段长2(KB)">
                <el-input v-model="form1.f2" />
            </el-form-item>
            <el-form-item label="段长3(KB)">
                <el-input v-model="form1.f3" />
            </el-form-item>
            <el-form-item label="段长4(KB)">
                <el-input v-model="form1.f4" />
            </el-form-item>
            <el-form-item
                ><el-button text @click="dialogVisible = true"> 进程申请内存 </el-button>
                <el-button type="primary" @click="submit()"> Create </el-button>
                <!-- <el-button @click="moni()">开始模拟</el-button> -->
                <el-button type="primary" @click="init()"> 随机分配内存 </el-button>
            </el-form-item>
        </el-form>

        <div>
            进程号
            <el-input-number v-model="pNum" :min="1" :max="4" @change="handleChange" />
            段号
            <el-input-number v-model="fragementNum" :min="0" :max="3" @change="handleChange" />
            页号
            <el-input-number v-model="pageNum" :min="0" :max="7" @change="handleChange" />
        </div>
        访问情况 {{ circumstance }} <br /><br /><br />

        <el-button type="primary" @click="operate()"> 处理中断 </el-button>
        {{ pNum }} --{{ fragementNum }} -- {{ pageNum }}

        <br /><br /><br />
        <br />
        <div>进程数：{{ processNum }}</div>
        <div class="content">
            <div class="main">
                {{ '内存 白色表明空闲 灰色表明占用' }}
                <div v-for="n in 8" class="row">
                    <div v-for="n in 8" class="col box"></div>
                </div>
            </div>
        </div>

        <div v-for="item in processSet" style="margin-top: 20%">
            段表
            {{ item.fragmentTable }}
            <br />
            驻留集
            {{ item.residentSet }}
            <br />
            进入的fifo队列
            {{ item.fifoqueue }}
        </div>

        <el-dialog v-model="dialogVisible" title="Tips" width="80%" :before-close="handleClose">
            <span>请填入id 和相应的段和相应的块的大小</span>
            <template #footer>
                <el-form
                    :label-position="labelPosition"
                    label-width="100px"
                    :model="form1"
                    style="max-width: 460px"
                >
                    <el-form-item label="进程序号">
                        <el-input v-model="request.id" />
                    </el-form-item>
                    <el-form-item label="进程段数">
                        <el-input v-model="request.fnum" />
                    </el-form-item>
                    <el-form-item label="段请求" prop="type">
                        <el-checkbox-group v-model="request.type">
                            <el-checkbox label="1" name="type" />
                            <el-checkbox label="2" name="type" />
                            <el-checkbox label="3" name="type" />
                            <el-checkbox label="4" name="type" />
                        </el-checkbox-group>
                    </el-form-item>
                    <el-form-item label="段长1(KB)">
                        <el-input v-model="request.f1" />
                    </el-form-item>
                    <el-form-item label="段长2(KB)">
                        <el-input v-model="request.f2" />
                    </el-form-item>
                    <el-form-item label="段长3(KB)">
                        <el-input v-model="request.f3" />
                    </el-form-item>
                    <el-form-item label="段长4(KB)">
                        <el-input v-model="request.f4" />
                    </el-form-item>
                </el-form>
                <span class="dialog-footer">
                    <el-button type="primary" @click="requestMemory()"> 确认 </el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
// 	输出当前内存分配情况（有多少可用块、哪些块可用？）； √
// 	手工输入进程的内存总需求（多少段，每个段多大）； √
// 	手工输入某进程的内存申请（哪几个段，各自需要多少块？），输出系统为其分配内存后的段表和页表内容。 √
// 	模拟内存访问指令的地址映射：比如手工输入一个逻辑地址，系统提示是否缺段、缺页，若不缺段、不缺页，则输出其物理地址；
// 	若缺段或缺页，则输出装入（被淘汰）的块号，输出缺段或缺页中断处理后的段表和页表信息。

//前端区域
import type { number } from 'echarts'
import { progressProps } from 'element-plus'
import { functionsIn, type NumericDictionary } from 'lodash'
import { reactive, ref, setBlockTracking } from 'vue'
import { onMounted, onUpdated } from 'vue'
/********dialog*****/
import { ElMessageBox } from 'element-plus'

const dialogVisible = ref(false) //控制dialog出现和关闭

const handleClose = (done: () => void) => {
    ElMessageBox.confirm('Are you sure to close this dialog?')
        .then(() => {
            done()
        })
        .catch(() => {
            // catch error
        })
}
/********dialog*****/

/*******form*****/
const labelPosition = ref('right')
const processNum = ref(0)
const form1 = reactive({
    id: 0,
    fnum: 0,
    f1: 0,
    f2: 0,
    f3: 0,
    f4: 0
})

const request = reactive({
    id: 0,
    fnum: 0,
    f1: 0,
    f2: 0,
    f3: 0,
    f4: 0,
    type: []
})

function submit() {
    let tmp: ftable = new ftable(form1.id, form1.fnum, form1.f1, form1.f2, form1.f3, form1.f4)
    //进程计数器++
    processNum.value++
    //初始化页表
    tmp.pageset = [new ptable([]), new ptable([]), new ptable([]), new ptable([])]
    // console.log(processNum.value)
    //进程创建
    let tmpProcess: process = new process(tmp)
    tmpProcess.fragmentTable = tmp
    //分配驻留集
    let cnt: number = 0
    for (let i: number = 0; i < 64; i++) {
        if (mainMemory[i] == 0 && cnt < 8) {
            mainMemory[i] = 1 //标志已经占用内存
            let boxSet = document.getElementsByClassName('box')
            boxSet[i].setAttribute('style', 'background-color:grey')
            cnt++
            tmpProcess.residentSet.push(i)
        }
    }
    processSet.push(tmpProcess)
    console.log(mainMemory)
}
//内存变化
function requestMemory() {
    dialogVisible.value = false
    let id: number = request.id - 1
    let blocklenset: number[] = [request.f1, request.f2, request.f3, request.f4]
    console.log(blocklenset)

    let cntidx: number = processSet[id].residentIdx //检查驻留集是否到达末尾
    for (let i of request.type) {
        let ftmp = parseInt(i) - 1 //第几个段

        // 设置第ftmp个段在内存内，分配起始下标

        processSet[id].fragmentTable.beginAddr[ftmp] =
            processSet[id].residentSet[processSet[id].residentIdx]

        processSet[id].fragmentTable.inMain[ftmp] = true

        let cntquestMemoryIdx: number = 0 //内存请求的分配指针
        // 分配页表长度
        while (cntidx < 8 && cntquestMemoryIdx < blocklenset[ftmp]) {
            //未到达末尾
            //相应id的段表中 对应申请的页表中 压入驻留集中下标
            processSet[id].fragmentTable.pageset[ftmp].page[cntquestMemoryIdx] =
                processSet[id].residentSet[cntidx]

            processSet[id].fifoqueue.push({ fragNumber: ftmp, pageNumber: cntquestMemoryIdx })
            //驻留集中地址下标向后
            cntidx++
            cntquestMemoryIdx++
        }
    }
    processSet[id].residentIdx = cntidx
    //重置fifo
    if (processSet[id].residentIdx > 7) {
        processSet[id].residentIdx = 0
    }
}

function init() {
    //随机锁定内存
    for (let i: number = 0; i < 6; i++) {
        mainLock.push(Math.floor((Math.random() * 100) % 64))
    }
    // console.log(mainLock)
    //设置灰色
    let boxSet = document.getElementsByClassName('box')
    for (let i of mainLock) {
        console.log(i)

        boxSet[i].setAttribute('style', 'background-color:grey')
    }
    // 同步进入内存
    for (let i of mainLock) {
        mainMemory[i] = 2
    }
}

/*******form*****/

/*******输入框*****/
const fragementNum = ref(0)
const pageNum = ref(0)
const pNum = ref(0)

const handleChange = () => {
    //pNum个进程 的 fragmentNum段的页表

    let tmp =
        processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[pageNum.value]

    if (processSet[pNum.value - 1].fragmentTable.inMain[fragementNum.value] == false) {
        circumstance = '缺段中断'
    } else if (
        processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[pageNum.value] ==
        -1
    ) {
        circumstance = '缺页中断'
    } else {
        circumstance = tmp.toString()
    }
}

/*******输入框*****/

/*******中断处理*****/

function operate() {
    if (circumstance == '缺页中断') {
        if (processSet[pNum.value - 1].residentIdx < 8) {
            let swapidx: number = 0
            for (let i = 0; i < 8; i++) {
                if (
                    processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[i] ==
                    -1
                ) {
                    processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[i] =
                        processSet[pNum.value - 1].residentSet[
                            processSet[pNum.value - 1].residentIdx++
                        ]
                    //弹出
                    let tmpNode = processSet[pNum.value - 1].fifoqueue[0]
                    processSet[pNum.value - 1].fifoqueue.shift()
                    processSet[pNum.value - 1].fragmentTable.pageset[tmpNode.fragNumber].page[
                        tmpNode.pageNumber
                    ] = -1
                    //压入
                    processSet[pNum.value - 1].fifoqueue.push({
                        fragNumber: fragementNum.value,
                        pageNumber: i
                    })
                    break
                }
            }
        } else {
            // 找到第一个进入的
            processSet[pNum.value - 1].residentIdx = 0
            processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[0] =
                processSet[pNum.value - 1].residentSet[processSet[pNum.value - 1].residentIdx++]
            //压入
            processSet[pNum.value - 1].fifoqueue.push({
                fragNumber: fragementNum.value,
                pageNumber: 0
            })
        }

        //更改起始地址
        for (let i: number = 0; i < 4; i++) {
            for (let j: number = 0; j < 8; j++) {
                if (processSet[pNum.value - 1].fragmentTable.pageset[i].page[j] != -1) {
                    processSet[pNum.value - 1].fragmentTable.beginAddr[i] = j
                    break
                }
            }
        }
    } else if (circumstance == '缺段中断') {
        processSet[pNum.value - 1].fragmentTable.inMain[fragementNum.value] = true
        processSet[pNum.value - 1].fragmentTable.beginAddr[fragementNum.value] =
            processSet[pNum.value - 1].residentSet[processSet[pNum.value - 1].residentIdx++]
        if (processSet[pNum.value - 1].residentIdx < 8) {
            processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[0] =
                processSet[pNum.value - 1].residentSet[processSet[pNum.value - 1].residentIdx++]
            //弹出
            let tmpNode = processSet[pNum.value - 1].fifoqueue[0]
            processSet[pNum.value - 1].fifoqueue.shift()
            processSet[pNum.value - 1].fragmentTable.pageset[tmpNode.fragNumber].page[
                tmpNode.pageNumber
            ] = -1
            //压入
            processSet[pNum.value - 1].fifoqueue.push({
                fragNumber: fragementNum.value,
                pageNumber: 0
            })
        } else {
            processSet[pNum.value - 1].residentIdx = 0
            processSet[pNum.value - 1].fragmentTable.pageset[fragementNum.value].page[0] =
                processSet[pNum.value - 1].residentSet[processSet[pNum.value - 1].residentIdx++]
            //弹出
            let tmpNode = processSet[pNum.value - 1].fifoqueue[0]
            processSet[pNum.value - 1].fifoqueue.shift()
            processSet[pNum.value - 1].fragmentTable.pageset[tmpNode.fragNumber].page[
                tmpNode.pageNumber
            ] = -1
            //压入
            processSet[pNum.value - 1].fifoqueue.push({
                fragNumber: fragementNum.value,
                pageNumber: 0
            })
        }

        //更改起始地址
        for (let i: number = 0; i < 4; i++) {
            for (let j: number = 0; j < 8; j++) {
                if (processSet[pNum.value - 1].fragmentTable.pageset[i].page[j] != -1) {
                    processSet[pNum.value - 1].fragmentTable.beginAddr[i] = j
                    break
                }
            }
        }
    }
}

/*******中断处理*****/

/*********************************************/
//后端
let circumstance: string = 'none'

onUpdated(() => {
    console.log(mainLock)
})

let mainLock: number[] = []

class ptable {
    page: number[] //通过数组对应存入的页框
    constructor(page: number[]) {
        this.page = [-1, -1, -1, -1, -1, -1, -1, -1]
    }
}

//段表
class ftable {
    id: number
    fnum: number //记录段的数量
    inMain: boolean[] = [false, false, false, false] //记录在不在内存里面
    flen1: number //段长
    flen2: number
    flen3: number
    flen4: number
    beginAddr: number[] = [-1, -1, -1, -1]
    pageset: ptable[]

    constructor(
        id: number,
        fnum: number,
        flen1: number,
        flen2: number,
        flen3: number,
        flen4: number
    ) {
        this.id = id
        this.fnum = fnum
        this.flen1 = flen1
        this.flen2 = flen2
        this.flen3 = flen3
        this.flen4 = flen4
        this.pageset = [] //装入内存后才分配
    }
}
// 定向类型
type BinaryStructure = {
    fragNumber: number
    pageNumber: number
}

//进程
class process {
    fragmentTable: ftable
    residentSet: number[]
    residentIdx: number
    fifoqueue: BinaryStructure[]
    constructor(fragmentTable: ftable) {
        this.fragmentTable = fragmentTable
        this.residentSet = []
        this.residentIdx = 0
        this.fifoqueue = []
    }
}

//主存
let mainMemory: number[] = new Array(64).fill(0)
let processSet: process[] = []
// 模拟进程 之后要改成输入

// 存入内存后 用一个队列保存进程存在内存当中的指针

// 每个内存都有一个自己的驻留集
</script>

<style scoped>
.content {
    width: 100%;
}
.main {
    margin: 0 auto;
    width: 320px;
    height: 320px;
}
.row {
    display: flex;
}
.col {
    display: block;
    width: 40px;
    height: 40px;
    border: solid black;
    margin: 0;
    padding: 0;
}
</style>
