#include <iostream>

#include <vector>

#include <string>

#include <cmath>

#include <fstream>

#include <sstream>

#include <bitset>

#include <iomanip>

#include "cacheline.h"

using namespace std;

//a function print_simulator_configuration(int,int,int,int,int, int) to print the command line arguments
void print_simulator_configuration(int block_size,int l1_size,int l1_assoc,int l2_size,int l2_assoc,int replacement){
    
  cout << "===== Simulator configuration =====" << endl;
  cout << "BLOCKSIZE:\t\t\t" << block_size << endl;
  cout << "L1_SIZE:\t\t\t" << l1_size << endl;
  cout << "L1_ASSOC:\t\t\t" << l1_assoc << endl;
  cout << "L2_SIZE:\t\t\t" << l2_size << endl;
  cout << "L2_ASSOC:\t\t\t" << l2_assoc << endl;
  

}

// a function declaration external_cache_access(int, string, int, int) 
void external_cache(int bit_address, string access_mode, int trace_index, int level);
 

class Cache {
  private:
    int cache_level;
  int reads = 0, RM = 0, writes = 0, WM = 0, WB = 0;
  vector < int > lru_counter;

  public:
    int size, total_mem_traffic = 0;
  int block_size, assoc, replacement, inclusion;
  int no_of_sets, tag_bits, index_bits, offset_bits;
  int tag_mask, index_mask, offset_mask;
// Cache is a vector of vector of cachelines
  vector < vector < Line >> cache;
//object instatntiation of class cache. different values required for the simulation are calculated such as no. of sets, index bits, offset bits, etc
  Cache(int level, int b_size, int cache_size, int cache_assoc, int rep_pol, int inc_prop) {
    cache_level = level;
    block_size = b_size;
    size = cache_size;
    assoc = cache_assoc;
    replacement = rep_pol;
    inclusion = inc_prop;

    if (size > 0) {
      no_of_sets = size / (assoc * block_size);
      index_bits = log2(no_of_sets);
      offset_bits = log2(block_size);
      tag_bits = 32 - index_bits - offset_bits;
      offset_mask = pow(2, offset_bits) - 1;
      index_mask = pow(2, index_bits) - 1;
      cache.resize(no_of_sets);
      
      
      if (replacement == 0) {
        lru_counter.resize(no_of_sets);
      } else if (replacement == 1) {
        // ADD CODE FOR FIFO
      }

      for (int i = 0; i < cache.size(); i++) {
        cache[i].resize(assoc);
      }
    }
  }
    
  void print_details();
  void access(int32_t bit_address, string access_mode, int trace_index);
  void print_results();
  float calculate_miss_rate(int read_misses, int write_misses, int reads, int writes) {
    float miss_rate = (float)(read_misses + write_misses) / (float)(reads + writes);
    return miss_rate;
  };
  int calc_total_mem_traffic(int read_misses, int write_misses, int writebacks) {
    total_mem_traffic += read_misses + write_misses + writebacks;
    return total_mem_traffic;
  };

};


void Cache::access(int32_t bit_address, string access_mode, int trace_index) {
  int offset, index, tag;

    
    int32_t address_copy = bit_address;
    offset = address_copy & offset_mask;
    address_copy = address_copy >> offset_bits;
    index = address_copy & index_mask;
    address_copy = address_copy >> index_bits;
    tag = address_copy;

  if (access_mode == "w") writes++;
  else reads++;

  int invalid_index_bit = -1;
     int i=0;
    while(i < cache[index].size()){
   
    if (cache[index][i].valid) {

      if (cache[index][i].tag == tag) {

        if (access_mode == "w") {
          cache[index][i].dirty = 1;
        }

        if (replacement == 0) {
          
          cache[index][i].lru_count = lru_counter[index]++;
        }
        return;
      }
    } else if (invalid_index_bit == -1) {

      invalid_index_bit = i;
    } i++;
  }

  if (invalid_index_bit != -1) {

    if (replacement == 0) {
      cache[index][invalid_index_bit] = Line(1, 1, tag, bit_address, lru_counter[index]++);
    }

    if (cache_level == 1) {
      external_cache(bit_address, "r", trace_index, 2);
    }

    if (access_mode == "r") {
      cache[index][invalid_index_bit].dirty = 0;
    }
  } else {

    int replacement_index;

    if (replacement == 0) {

      int min_count = INT32_MAX;

      for (int i = 0; i < cache[index].size(); i++) {
        if (cache[index][i].lru_count < min_count) {
          min_count = cache[index][i].lru_count;
          replacement_index = i;
        }
      }
    }

    if (cache[index][replacement_index].dirty) {

      WB++;

      if (cache_level == 1) {

        external_cache(cache[index][replacement_index].addr, "w", trace_index, 2);
      }

      if (cache_level == 2 && inclusion) {
        external_cache(cache[index][replacement_index].addr, "w", trace_index, 1);
      }
    }

    cache[index][replacement_index] = Line(1, 0, tag, bit_address, lru_counter[index]++);

    if (cache_level == 1) {
      external_cache(bit_address, "r", trace_index, 2);
    }

    if (access_mode == "w") {

      cache[index][replacement_index].dirty = 1;
    }
  }

  if (access_mode == "w") WM++;
  else RM++;

  return;
}

void Cache::print_details(void) {
  cout << "==contents of level " << cache_level << " cache====" << endl;

  for (int i = 0; i < cache.size(); i++) {
    cout << "Set " << i << ":\t\t";

    for (int j = 0; j < cache[i].size(); j++) {
      stringstream ss;
      ss << hex << cache[i][j].tag;
      string dirty;

      if (cache[i][j].dirty) {
        dirty = " D";
      } else {
        dirty = "  ";
      }

      cout << setw(8) << ss.str() << dirty << '\t';
    }

    cout << endl;
  }
}

void Cache::print_results(void) {
  float miss_rate = 0;
  total_mem_traffic = calc_total_mem_traffic(RM, WM, WB);
  if (cache_level == 1) {
    cout << "a. number of L1 reads:\t\t" << reads << endl;
    cout << "b. number of L1 read misses:\t" << RM << endl;
    cout << "c. number of L1 writes:\t\t" << writes << endl;
    cout << "d. number of L1 write misses:\t" << WM << endl;
    cout << "e. L1 miss rate:\t\t" << fixed << setprecision(6) << calculate_miss_rate(RM, WM, reads, writes) << endl;
    cout << "f. number of L1 writebacks:\t" << WB << endl;
  } else {
    cout << "g. number of L2 reads:\t\t" << reads << endl;
    cout << "h. number of L2 read misses:\t" << RM << endl;
    cout << "i. number of L2 writes:\t\t" << writes << endl;
    cout << "j. number of L2 write misses:\t" << WM << endl;
    cout << "k. L2 miss rate:\t\t";

    if (size == 0) {
      cout << "0" << endl;
    } else {
      miss_rate = (float)(RM) / (float)(reads);
      cout << fixed << setprecision(6) << miss_rate << endl;
    }

    cout << "l. number of L2 writebacks:\t" << WB << endl;
  }
}

Cache l1(0, 0, 0, 0, 0, 0);
Cache l2(0, 0, 0, 0, 0, 0);

int calc_elements(int bit_address, string access_mode, int trace_index, int level){
    int offset, index, tag;

    offset = bit_address & l1.offset_mask;
    bit_address >>= l1.offset_bits;
    index = bit_address & l1.index_mask;
    bit_address >>= l1.index_bits;
    tag = bit_address;
    return index,tag,offset;
};
void external_cache(int bit_address, string access_mode, int trace_index, int level) {
  if (level == 2 && l2.size > 0) {
    l2.access(bit_address, access_mode, trace_index);
  } else if (level == 1) {
      int index, tag, offset = calc_elements(bit_address,access_mode, trace_index,level);
     
     int i = 0;
     while(i < l1.cache[index].size())
     {
      if (l1.cache[index][i].valid) {

        if (l1.cache[index][i].tag == tag) {

          l1.cache[index][i].valid = 0;

          if (l1.cache[index][i].dirty) {
            l2.total_mem_traffic++;
          }

          return;
        }
      }i++;
    }
  }

  return;
}


int main(int argc, char * argv[]) {
  int block_size = stoi(argv[1]);
  int l1_size = stoi(argv[2]);
  int l1_assoc = stoi(argv[3]);
  int l2_size = stoi(argv[4]);
  int l2_assoc = stoi(argv[5]);
  int replacement = stoi(argv[6]);
  int inclusion = stoi(argv[7]);
  string trace_path = argv[8];
  
  print_simulator_configuration( block_size,l1_size, l1_assoc, l2_size, l2_assoc, replacement);

  

  switch (inclusion) {
  

  case 0:
    cout << "REPLACEMENT POLICY:\tinclusive" << endl;
    break;
case 1:
    cout << "REPLACEMENT POLICY:\tnon-inclusive" << endl;
    break;

  default:
    cout << "non inclusive" << endl;
    break;
  }

  if (replacement == 0) {
    cout << "Least Recent Used" << endl;
  } else if (replacement == 1) {
    cout << "First IN First Out" << endl;
  }

  cout << "inclusion:\t";

  cout << "trace_file:\t\t" << trace_path << endl;

  l1 = Cache(1, block_size, l1_size, l1_assoc, replacement, inclusion);
  l2 = Cache(2, block_size, l2_size, l2_assoc, replacement, inclusion);

  fstream trace_file;

  trace_file.open(trace_path, ios:: in );

  if (trace_file.is_open()) {
    int count = 0;
    string file_line;
    string access_mode;
    string address;
    int res;

    while (trace_file >> access_mode >> address) {
      l1.access(stoi(address, nullptr, 16), access_mode, count);
      count++;
    }

    l1.print_details();
    if (l2_size > 0) {
      l2.print_details();
    }

  }
  trace_file.close();

  cout << "===== Simulation results (raw) =====" << endl;

  l1.print_results();
  l2.print_results();

  if (l2_size > 0) {
    cout << "m. total memory traffic:\t" << l2.total_mem_traffic << endl;
  } else {
    cout << "m. total memory traffic:\t" << l1.total_mem_traffic << endl;
  }

  return 0;
}