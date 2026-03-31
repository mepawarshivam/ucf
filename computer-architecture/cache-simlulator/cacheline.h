class Line {
  public:
    int valid, dirty, tag, addr, lru_count = 0;

  Line() {
    valid = 0;
    dirty = 0;
  }

  Line(int v, int d, int t, int a) {
    valid = v;
    dirty = d;
    tag = t;
    addr = a;
  }

  Line(int v, int d, int t, int a, int c) {
    valid = v;
    dirty = d;
    tag = t;
    addr = a;
    lru_count = c;
  }

};